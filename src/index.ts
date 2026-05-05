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
export { Group, MondayFetchClient } from './client'
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
  ColumnType,
  FilterOperator,
  FilterRule,
  InferColumnDefinition,
  InferColumnType,
  ItemFromSchema,
  MondayFile,
  MondayGroup,
  MondayPerson,
  MondayStatus,
  PageResult,
  QueryOptions,
  QueryState,
  SelectedColumns,
  SelectionMap,
  WithGroup
} from './types'

// Metadata query builders
export { BoardQueryBuilder, FolderQueryBuilder, WebhookQueryBuilder } from './meta/index'
export type { Board, FolderRef, FolderScalars, Webhook, WebhookConfig } from './meta/index'

// Admin types
export type {
  Column,
  ColumnConfig,
  ColumnValueEventConfig,
  ColumnType as CreateColumnType,
  EventConfig,
  Folder,
  GroupItemEventConfig,
  SimpleEventConfig,
  StatusColumnEventConfig,
  User,
  WebhookEvent
} from './admin'

// Tracking system
export {
  BoardTracker,
  onColumnChange,
  onCreate,
  onStatusChange,
  // payload types
  WebhookPayload,
  ItemPayload,
  ItemPayloadEvent,
  CreateItemPayload,
  ItemArchivedPayload,
  ItemDeletedPayload,
  ItemRestoredPayload,
  ItemMovedToGroupPayload,
  ItemNameChangedPayload,
  UpdateColumnValuePayload,
  CreateSubitemPayload,
  CreateUpdatePayload,
  EditUpdatePayload,
  DeleteUpdatePayload,
  CreateColumnPayload,
  // column value shapes
  StatusUpdate,
  DateUpdate,
  PersonUpdate,
  PeopleUpdate,
  DropdownUpdate,
  ConnectUpdate,
  TextUpdate,
  NumberUpdate
} from './tracking'
