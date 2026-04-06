/**
 * Monday.com Query Library
 *
 * Type-safe, chainable query builder for Monday.com boards
 *
 * @example
 * ```typescript
 * const VacationSchema = {
 *   email: { id: 'email_col', type: 'email' },
 *   status: { id: 'status_col', type: 'status' },
 *   start_date: { id: 'start_col', type: 'date' }
 * } as const
 *
 * const board = new MondayBoard(VacationSchema, '123456')
 *
 * const approvedRequests = await board
 *   .query()
 *   .contains('status', 'Approved')
 *   .greaterThan('start_date', new Date('2025-01-01'))
 *   .returning({ email: true, start_date: true })
 * ```
 */

export { BoardAdmin } from './admin'
export { MondayBoard } from './board'
export { GraphQLBuilder } from './graphql'
export { BoardMutation } from './mutation'
export { ResponseParser } from './parser'
export { BoardQuery } from './query'

// Client interface
export { MondayFetchClient } from './client'
export type { MondayClient } from './client'

// Error classes
export {
  AuthenticationError,
  MondayApiError,
  MondayError,
  NetworkError,
  ParseError,
  QuerySyntaxError,
  RateLimitError,
  ValidationError
} from './errors'

// Type system
export type {
  BoardSchema,
  ColumnDefinition,
  FilterOperator,
  FilterRule,
  InferColumnDefinition,
  InferColumnType,
  ItemFromSchema,
  MondayFile,
  MondayPerson,
  MondayStatus,
  PageResult,
  ColumnType,
  QueryState,
  SelectedColumns,
  SelectionMap
} from './types'

// Admin types
export type {
  Column,
  ColumnConfig,
  ColumnType as CreateColumnType,
  ColumnValueEventConfig,
  EventConfig,
  Folder,
  Group,
  GroupItemEventConfig,
  SimpleEventConfig,
  StatusColumnEventConfig,
  User,
  Webhook,
  WebhookEvent
} from './admin'

// Tracking system
export {
  BoardTracker,
  CreateItemPayload,
  ItemPayload,
  onColumnChange,
  onCreate,
  onStatusChange,
  UpdateColumnValuePayload,
  WebhookPayload
} from './tracking'
