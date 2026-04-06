import { BoardAdmin } from '../admin'
import type { MondayClient } from '../client'
import type { BoardSchema } from '../types'
import { ResponseParser } from '../parser'
import { getHandlers, type HandlerMetadata } from './decorators'
import type { ItemPayloadEvent, StatusUpdate, UpdateColumnValuePayload, WebhookPayload } from './types'

/**
 * Base class for handling Monday.com webhooks for a specific board
 *
 * Provides:
 * - Automatic webhook setup via decorators or manual configuration
 * - Event routing and dispatching to handler methods
 * - Type-safe board queries
 *
 * @example
 * ```typescript
 * export class VacationTracker extends BoardTracker<typeof VacationSchema> {
 *   @onCreate()
 *   async handleNewRequest(item: any, event: CreateItemPayload) { ... }
 *
 *   @onColumnChange('email')
 *   async handleEmail(newValue: any, oldValue: any, event: UpdateColumnValuePayload) { ... }
 *
 *   @onStatusChange('status', { to: 'Approved' })
 *   async handleApproval(newLabel: string, oldLabel: string, event: UpdateColumnValuePayload) { ... }
 * }
 * ```
 */
export abstract class BoardTracker<TSchema extends BoardSchema> {
  protected readonly admin: BoardAdmin
  private handlerMetadata: HandlerMetadata[] | null = null

  constructor(protected readonly client: MondayClient, protected readonly schema: TSchema) {
    this.admin = new BoardAdmin(client)
  }

  /**
   * Main webhook handler - receives all events for this board
   * Routes to appropriate handler methods
   *
   * @param payload - Webhook payload from Monday.com
   * @returns Challenge response if applicable
   */
  async handleWebhook(payload: WebhookPayload): Promise<any> {
    // Handle challenge
    if ('challenge' in payload) {
      return payload
    }

    const { event } = payload
    if (event) {
      await this.dispatch(event)
    }
  }

  private async dispatch(event: ItemPayloadEvent): Promise<void> {
    const handlers = this.getHandlerMetadata()
    for (const handler of handlers) {
      if (this.shouldCallHandler(event, handler)) {
        const args = this.parseEventArgs(event, handler)
        await (this as any)[handler.method](...args)
      }
    }
  }

  /**
   * Parse event into handler arguments based on event type
   * Returns array of arguments to spread into handler method
   */
  private parseEventArgs(event: ItemPayloadEvent, handler: HandlerMetadata): any[] {
    if (handler.eventType === 'on_new_item' && event.type === 'create_pulse') {
      const createEvent = event as any
      const parsedItem = this.parseColumnValues(createEvent.columnValues)
      return [parsedItem, event]
    }

    if (handler.eventType === 'on_change_status' && event.type === 'update_column_value') {
      const statusEvent = event as UpdateColumnValuePayload<StatusUpdate>
      const newLabel = statusEvent.value?.label?.text || null
      const oldLabel = statusEvent.previousValue?.label?.text || null
      return [newLabel, oldLabel, event]
    }

    if (handler.eventType === 'on_change_column' && event.type === 'update_column_value') {
      const updateEvent = event as UpdateColumnValuePayload
      return [updateEvent.value, updateEvent.previousValue, event]
    }

    // Fallback: just pass the event
    return [event]
  }

  /**
   * Parse Monday.com webhook columnValues into clean object
   * Delegates to ResponseParser which uses schema for type-aware parsing
   */
  private parseColumnValues(columnVals: any): any {
    return ResponseParser.parseWebhookColumnValues(columnVals, this.schema)
  }

  // Decorator support (lazily loaded)
  private getHandlerMetadata(): HandlerMetadata[] {
    if (this.handlerMetadata === null) {
      this.handlerMetadata = getHandlers(this.constructor)
    }
    return this.handlerMetadata
  }

  private shouldCallHandler(event: ItemPayloadEvent, handler: HandlerMetadata): boolean {
    // Match event type
    if (handler.eventType === 'on_new_item' && event.type !== 'create_pulse') {
      return false
    }

    if (
      (handler.eventType === 'on_change_column' || handler.eventType === 'on_change_status') &&
      event.type !== 'update_column_value'
    ) {
      return false
    }

    // For column/status change events, match column
    if ((handler.eventType === 'on_change_column' || handler.eventType === 'on_change_status') && handler.column) {
      const updateEvent = event as UpdateColumnValuePayload
      const columnDef = this.schema[handler.column]

      if (!columnDef || updateEvent.columnId !== columnDef.id) {
        return false
      }

      // Check ignoreEmpty option
      if (handler.options?.ignoreEmpty) {
        // For status columns, check the label text
        if (handler.eventType === 'on_change_status') {
          const statusEvent = updateEvent as UpdateColumnValuePayload<StatusUpdate>
          if (!statusEvent.value?.label?.text) {
            return false
          }
        } else {
          // For other columns, check the value itself
          if (!updateEvent.value || Object.keys(updateEvent.value).length === 0) {
            return false
          }
        }
      }
    }

    // Match status transitions (only for status_change)
    if (handler.eventType === 'on_change_status') {
      const updateEvent = event as UpdateColumnValuePayload<StatusUpdate>

      if (handler.options?.to) {
        const toLabels = Array.isArray(handler.options.to) ? handler.options.to : [handler.options.to]
        const currentLabel = updateEvent.value?.label?.text
        if (!currentLabel || !toLabels.includes(currentLabel)) {
          return false
        }
      }

      if (handler.options?.from) {
        const fromLabels = Array.isArray(handler.options.from) ? handler.options.from : [handler.options.from]
        const previousLabel = updateEvent.previousValue?.label?.text
        if (!previousLabel || !fromLabels.includes(previousLabel)) {
          return false
        }
      }
    }

    return true
  }
}
