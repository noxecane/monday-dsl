import { InternalEvent } from './types'

const registry = new WeakMap<object, HandlerMetadata[]>()

export interface HandlerMetadata {
  method: string
  eventType: InternalEvent
  column?: string
  options?: {
    to?: string | string[]
    from?: string | string[]
    ignoreEmpty?: boolean
  }
}

/**
 * Decorator for handling column value changes
 * @param column - Column name from schema
 * @param options - Filter options (ignoreEmpty, etc)
 */
export function onColumnChange(column: string, options?: { ignoreEmpty?: boolean }): MethodDecorator {
  return function (target: any, method: string | symbol) {
    addHandler(target.constructor, {
      method: method.toString(),
      eventType: 'on_change_column',
      column,
      options
    })
  }
}

/**
 * Decorator for handling status column changes with transition filtering
 * @param column - Status column name from schema
 * @param options - Transition filters (to, from)
 */
export function onStatusChange(
  column: string,
  options?: { to?: string | string[]; from?: string | string[] }
): MethodDecorator {
  return function (target: any, method: string | symbol) {
    addHandler(target.constructor, {
      method: method.toString(),
      eventType: 'on_change_status',
      column,
      options
    })
  }
}

/**
 * Decorator for handling item creation events
 */
export function onCreate(): MethodDecorator {
  return function (target: any, method: string | symbol) {
    addHandler(target.constructor, {
      method: method.toString(),
      eventType: 'on_new_item'
    })
  }
}

function addHandler(constructor: object, handler: HandlerMetadata) {
  const handlers = registry.get(constructor) || []
  handlers.push(handler)
  registry.set(constructor, handlers)
}

export function getHandlers(constructor: object): HandlerMetadata[] {
  return registry.get(constructor) || []
}
