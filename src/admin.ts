/**
 * Monday.com Query Library - Board Administration
 *
 * Provides admin operations for managing boards, webhooks, columns, and users
 */

import { MondayClient } from './client'

/**
 * Convert object to GraphQL argument string
 * Properly escapes JSON for use in GraphQL mutations
 */
function toGraphQLArgument(obj: object | undefined): string {
  if (!obj) return '{}'

  const json = JSON.stringify(obj)
  // Escape quotes and backslashes for GraphQL string literal
  return `"${json.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Webhook event types supported by Monday.com
 */
export type WebhookEvent =
  | 'change_specific_column_value'
  | 'change_column_value'
  | 'change_status_column_value'
  | 'change_subitem_column_value'
  | 'change_name'
  | 'create_item'
  | 'item_archived'
  | 'item_deleted'
  | 'item_moved_to_any_group'
  | 'item_moved_to_specific_group'
  | 'item_restored'
  | 'create_subitem'
  | 'change_subitem_name'
  | 'move_subitem'
  | 'subitem_archived'
  | 'subitem_deleted'
  | 'create_column'
  | 'create_update'
  | 'edit_update'
  | 'delete_update'
  | 'create_subitem_update'

/**
 * Simple event configuration (no additional config needed)
 */
export interface SimpleEventConfig {
  event:
    | 'change_column_value'
    | 'change_subitem_column_value'
    | 'change_name'
    | 'create_item'
    | 'item_archived'
    | 'item_deleted'
    | 'item_moved_to_any_group'
    | 'item_restored'
    | 'create_subitem'
    | 'change_subitem_name'
    | 'move_subitem'
    | 'subitem_archived'
    | 'subitem_deleted'
    | 'create_column'
    | 'create_update'
    | 'edit_update'
    | 'delete_update'
    | 'create_subitem_update'
}

/**
 * Event configuration for specific column value changes
 */
export interface ColumnValueEventConfig {
  event: 'change_specific_column_value'
  config: { columnId: string }
}

/**
 * Event configuration for item moved to specific group
 */
export interface GroupItemEventConfig {
  event: 'item_moved_to_specific_group'
  config: { groupId: string }
}

/**
 * Event configuration for status column changes
 */
export interface StatusColumnEventConfig {
  event: 'change_status_column_value'
  config: { columnValue: { index: number }; columnId: string }
}

/**
 * Union type for all webhook event configurations
 */
export type EventConfig = SimpleEventConfig | ColumnValueEventConfig | GroupItemEventConfig | StatusColumnEventConfig

/**
 * Webhook structure returned from API
 */
export interface Webhook {
  id: string
  event: WebhookEvent
  config: {
    column?: string
    labelIndex?: number
    groupId?: string
  }
}

/**
 * Monday.com user structure
 */
export interface User {
  id: string
  email: string
  enabled: boolean
  name?: string
}

/**
 * Board group structure
 */
export interface Group {
  id: string
  title: string
}

/**
 * Board folder structure
 */
export interface Folder {
  id: string
  name: string
  children: Array<{ id: string; name: string }>
  sub_folders?: Array<{ id: string }>
}

/**
 * Column type for creation
 */
export type ColumnType = 'text' | 'link' | 'timeline' | 'status' | 'dropdown' | 'date' | 'email' | 'phone' | 'number'

/**
 * Column configuration for creation
 */
export interface ColumnConfig {
  type: ColumnType
  labels?: string[] // For status/dropdown columns
  preface?: string // Column ID to place after
}

/**
 * Column information from API
 */
export interface Column {
  id: string
  title: string
  type: string
  settings_str?: string
}

/**
 * Board Administration - Handles admin operations on Monday.com boards
 *
 * Provides methods for:
 * - Webhook management (create, delete, list)
 * - Column management (create, get settings)
 * - User management (list users)
 * - Group management (list groups)
 * - Folder management (list boards in folders)
 *
 * @example
 * ```typescript
 * const admin = new BoardAdmin(client)
 *
 * // Create webhook
 * await admin.createWebhook('123456', {
 *   event: 'change_specific_column_value',
 *   config: { columnId: 'status_col' }
 * })
 *
 * // List webhooks
 * const webhooks = await admin.getWebhooks('123456')
 *
 * // Create column
 * await admin.createColumn('123456', 'new_col', 'Status Column', {
 *   type: 'status',
 *   labels: ['Pending', 'Approved', 'Rejected']
 * })
 * ```
 */
export class BoardAdmin {
  /**
   * Create a new BoardAdmin instance
   * @param client - Monday.com GraphQL client for API communication
   */
  constructor(private client: MondayClient) {}

  /**
   * Get board name by ID
   * @param boardId - Monday.com board ID
   * @returns Board name
   */
  async getBoardName(boardId: string): Promise<string> {
    const data = await this.client.run<any>(`{
      boards(ids: ${boardId}) {
        name
      }
    }`)
    return data.boards[0]?.name as string
  }

  /**
   * Get all groups in a board
   * @param boardId - Monday.com board ID
   * @returns Array of groups with id and title
   */
  async getGroups(boardId: string): Promise<Group[]> {
    const data = await this.client.run<any>(`{
      boards(ids: ${boardId}) {
        groups {
          id
          title
        }
      }
    }`)
    return data.boards[0]?.groups || []
  }

  /**
   * Get all non-guest users
   * @param limit - Number of users per page
   * @param page - Page number (1-indexed)
   * @returns Array of users
   */
  async getAllUsers(limit: number = 100, page: number = 1): Promise<User[]> {
    const data = await this.client.run<any>(`{
      users(limit: ${limit}, page: ${page}, kind: non_guests) {
        id
        email
        enabled
        name
      }
    }`)
    return data.users || []
  }

  /**
   * Get all columns in a board
   * @param boardId - Monday.com board ID
   * @returns Array of columns with id, title, and type
   */
  async getColumns(boardId: string): Promise<Column[]> {
    const data = await this.client.run<any>(`{
      boards(ids: ${boardId}) {
        columns {
          id
          title
          type
        }
      }
    }`)
    return data.boards[0]?.columns || []
  }

  /**
   * Get column settings (labels, colors, etc.) for all columns in a board
   * @param boardId - Monday.com board ID
   * @returns Object mapping column IDs to their settings
   */
  async getColumnSettings(boardId: string): Promise<Record<string, any>> {
    const data = await this.client.run<any>(`{
      boards(ids: ${boardId}) {
        columns {
          id
          settings_str
        }
      }
    }`)

    const columns = data.boards[0]?.columns || []
    return columns.reduce((acc: any, col: any) => {
      acc[col.id] = JSON.parse(col.settings_str)
      return acc
    }, {})
  }

  /**
   * Create a new column in a board
   * @param boardId - Monday.com board ID
   * @param columnId - Unique column ID
   * @param title - Column display title
   * @param config - Column configuration (type, labels, position)
   * @returns Created column information
   * @throws {ValidationError} If column configuration is invalid
   */
  async createColumn(boardId: string, columnId: string, title: string, config: ColumnConfig): Promise<Column> {
    let settings: any = null
    if (config.type === 'status' && config.labels) {
      const labelMap = config.labels.reduce((acc, label, index) => {
        acc[index] = label
        return acc
      }, {} as Record<number, string>)
      settings = { labels: labelMap }
    }

    const settingsArg = settings ? `defaults: ${toGraphQLArgument(settings)}` : ''
    const prefaceArg = config.preface ? `after_column_id: "${config.preface}"` : ''

    const query = `mutation {
      create_column(
        id: "${columnId}"
        board_id: ${boardId}
        title: "${title}"
        column_type: ${config.type}
        ${settingsArg}
        ${prefaceArg}
      ) {
        id
        title
        type
      }
    }`

    const data = await this.client.run<any>(query)
    return data.create_column
  }

  /**
   * Create a webhook for board events
   * @param boardId - Monday.com board ID
   * @param targetUrl - Webhook target URL
   * @param eventConfig - Webhook event configuration
   * @returns Created webhook information
   * @throws {ValidationError} If event configuration is invalid
   */
  async createWebhook(
    boardId: string,
    targetUrl: string,
    eventConfig: EventConfig
  ): Promise<{ id: string; board_id: string }> {
    const configArg = 'config' in eventConfig ? toGraphQLArgument(eventConfig.config) : '{}'

    const query = `mutation {
      create_webhook (
        board_id: ${boardId},
        url: "${targetUrl}",
        event: ${eventConfig.event},
        config: ${configArg}
      ) {
        id
        board_id
      }
    }`

    const data = await this.client.run<any>(query)
    return data.create_webhook
  }

  /**
   * Delete a webhook by ID
   * @param webhookId - Webhook ID to delete
   * @returns Deleted webhook ID
   */
  async deleteWebhook(webhookId: string): Promise<string> {
    const data = await this.client.run<any>(`mutation {
      delete_webhook (id: ${webhookId}) {
        id
      }
    }`)
    return data.delete_webhook.id
  }

  /**
   * Delete multiple webhooks in a single request
   * @param webhookIds - Array of webhook IDs to delete
   * @returns Array of deleted webhook IDs
   */
  async deleteWebhooks(webhookIds: string[]): Promise<string[]> {
    if (webhookIds.length === 0) return []

    const mutations = webhookIds.map((id, index) => `delete_${index}: delete_webhook (id: ${id}) { id }`)
    const query = `mutation { ${mutations.join(' ')} }`

    const data = await this.client.run<any>(query)
    return Object.values(data).map((result: any) => result.id)
  }

  /**
   * Get all webhooks for a board
   * @param boardId - Monday.com board ID
   * @returns Array of webhooks with parsed configurations
   */
  async getWebhooks(boardId: string): Promise<Webhook[]> {
    const data = await this.client.run<any>(`{
      webhooks(board_id: ${boardId}) {
        id
        event
        config
      }
    }`)

    return (data.webhooks || []).map((webhook: any) => {
      // Parse config string (format: "columnId=>value")
      const configStr = webhook.config.replace(/=>/g, ':')
      let parsedConfig: any = {}
      try {
        parsedConfig = JSON.parse(configStr)
      } catch {
        parsedConfig = {}
      }

      return {
        id: webhook.id,
        event: webhook.event,
        config: {
          column: parsedConfig.columnId,
          labelIndex: parsedConfig.columnValue?.index,
          groupId: parsedConfig.groupId
        }
      }
    })
  }

  /**
   * Get all boards in a folder (optionally recursive)
   * @param folderId - Monday.com folder ID
   * @param recursive - Whether to include boards from subfolders
   * @returns Array of boards in folder
   */
  async getBoardsByFolder(folderId: string, recursive: boolean = false): Promise<Array<{ id: string; name: string }>> {
    const data = await this.client.run<any>(`{
      folders (ids: ${folderId}) {
        id
        name
        children {
          id
          name
        }
        sub_folders {
          id
        }
      }
    }`)

    const folder: Folder = data.folders[0]
    if (!folder) return []

    let boards = folder.children || []

    // Recursively fetch from subfolders if requested
    if (recursive && folder.sub_folders && folder.sub_folders.length > 0) {
      for (const subfolder of folder.sub_folders) {
        const subfolderBoards = await this.getBoardsByFolder(subfolder.id, true)
        boards = boards.concat(subfolderBoards)
      }
    }

    return boards
  }

  /**
   * Helper method to create temporary item for operations (e.g., syncing column labels)
   * @param boardId - Monday.com board ID
   * @param operation - Function that performs operations using the temporary item
   * @returns Result from operation function
   *
   * @internal This is used for operations like syncing dropdown/status labels
   */
  async withTemporaryItem<T>(boardId: string, operation: (itemId: string) => Promise<T>): Promise<T> {
    // Create temporary item
    const createData = await this.client.run<any>(`mutation {
      create_item (board_id: ${boardId}, item_name: "temp_item_${Date.now()}") {
        id
      }
    }`)

    const itemId = createData.create_item.id

    try {
      // Perform operation with temporary item
      return await operation(itemId)
    } finally {
      // Clean up - delete temporary item
      await this.client.run<any>(`mutation { delete_item (item_id: ${itemId}) { id } }`)
    }
  }
}
