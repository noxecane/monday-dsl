/**
 * Monday.com Query Library - Type Definitions
 *
 * Core types for schema definition and type inference
 */

/**
 * Monday.com status column value
 */
export interface MondayStatus {
  label: string
  index?: number
  updated_at?: string
}

/**
 * Monday.com people column value
 */
export interface MondayPerson {
  id: string
  kind: string
}

/**
 * Monday.com file/asset column value
 */
export interface MondayFile {
  name: string
  url: string
}

export interface MondayUrl {
  url: string
  text: string
}

/**
 * Column types supported by Monday.com
 */
export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'iso'
  | 'status'
  | 'dropdown'
  | 'people'
  | 'email'
  | 'phone'
  | 'url'
  | 'connect'
  | 'mirror'
  | 'asset'
  | 'tag'

/**
 * Column definition in a board schema
 */
export interface ColumnDefinition {
  id: string
  type: ColumnType
  is_mirror?: boolean
  is_number?: boolean
  linked_schema?: BoardSchema
}

/**
 * Board schema - maps column keys to their definitions
 */
export type BoardSchema = Record<string, ColumnDefinition>

/**
 * Map Monday column types to TypeScript types
 */
export type InferColumnType<T extends ColumnType> = T extends 'text' | 'email' | 'phone'
  ? string
  : T extends 'number'
  ? number
  : T extends 'date' | 'time'
  ? string
  : T extends 'iso'
  ? Date | null
  : T extends 'status'
  ? MondayStatus
  : T extends 'dropdown'
  ? string[]
  : T extends 'people'
  ? MondayPerson[]
  : T extends 'url'
  ? MondayUrl
  : T extends 'connect'
  ? string[]
  : T extends 'asset'
  ? MondayFile[]
  : T extends 'tag'
  ? string[]
  : T extends 'mirror'
  ? string
  : unknown

/**
 * Infer TypeScript type from column definition
 * Handles nested connect columns with linked schemas
 */
export type InferColumnDefinition<T extends ColumnDefinition, TSelection = true> = T['is_number'] extends true
  ? number
  : T extends { type: 'connect'; linked_schema: infer TLinked }
  ? TSelection extends SelectionMap<any>
    ? TLinked extends BoardSchema
      ? Array<ItemFromSchema<TLinked, TSelection>> // Nested items with typed columns
      : string[]
    : string[] // Default to IDs when selection is boolean
  : InferColumnType<T['type']>

/**
 * Extract selected columns from schema
 * Handles both boolean and nested object selections
 */
export type SelectedColumns<TSchema extends BoardSchema, TSelection extends SelectionMap<TSchema>> = {
  [K in keyof TSelection as TSelection[K] extends false | undefined ? never : K]: K extends keyof TSchema
    ? InferColumnDefinition<TSchema[K], TSelection[K]>
    : never
}

/**
 * Item type inferred from schema and selection
 */
export type ItemFromSchema<
  TSchema extends BoardSchema,
  TSelection extends SelectionMap<TSchema> = Record<keyof TSchema, true>
> = {
  id: string
  name: string
} & SelectedColumns<TSchema, TSelection>

/**
 * Query filter operators
 */
export type FilterOperator =
  | 'any_of'
  | 'not_any_of'
  | 'contains_terms'
  | 'greater_than'
  | 'greater_than_or_equals'
  | 'lower_than'
  | 'lower_than_or_equals'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'

/**
 * Query filter rule
 */
export interface FilterRule {
  column_id: string
  operator: FilterOperator
  compare_value?: string | string[] | [string, string] | number[]
  compare_attribute?: string // For date filters: 'DATE', 'TIME', etc.
}

/**
 * Query state - accumulated filters and options
 */
export interface QueryState {
  filters: FilterRule[]
  limit?: number
  cursor?: string
  orderBy?: {
    column_id: string
    direction: 'asc' | 'desc'
  }
  operator?: 'and' | 'or'
}

/**
 * Selection map - which columns to return
 * Supports nested selections for connect columns
 */
export type SelectionMap<TSchema extends BoardSchema> = {
  [K in keyof TSchema]?:
    | boolean // Simple selection
    | (TSchema[K] extends { type: 'connect'; linked_schema: infer TLinked }
        ? TLinked extends BoardSchema
          ? SelectionMap<TLinked> // Nested selection for connect columns
          : boolean
        : boolean)
}

/**
 * Page result with items, cursor, and pagination metadata
 */
export interface PageResult<T> {
  items: T[]
  cursor?: string
  hasMore: boolean
}

/**
 * Column value input for mutations
 */
export type ColumnValueInput<T extends ColumnType> = T extends 'text' | 'email' | 'phone'
  ? string
  : T extends 'number'
  ? number
  : T extends 'date' | 'time'
  ? Date | string
  : T extends 'status'
  ? string // Label text
  : T extends 'dropdown'
  ? string[] | string
  : T extends 'people'
  ? string[] | string // Person IDs
  : T extends 'url'
  ? { url: string; text: string } | string
  : T extends 'connect'
  ? string[] | string // Item IDs
  : T extends 'asset'
  ? never // Files handled separately via upload API
  : T extends 'tag'
  ? string[] | string
  : string

/**
 * Create item input - partial schema with values
 */
export type CreateItemInput<TSchema extends BoardSchema> = {
  name: string
} & Partial<{
  [K in keyof TSchema]: ColumnValueInput<TSchema[K]['type']>
}>

/**
 * Update item input - partial schema with values (no name required)
 */
export type UpdateItemInput<TSchema extends BoardSchema> = {
  name?: string
} & Partial<{
  [K in keyof TSchema]: ColumnValueInput<TSchema[K]['type']>
}>

/**
 * Mutation operation type
 */
export type MutationOp = 'create' | 'update' | 'rename' | 'delete'

/**
 * Individual mutation operation
 */
export interface MutationOperation {
  op: MutationOp
  alias: string // Unique alias for this operation in the batch
  itemId?: string // For update, rename, delete
  name?: string // For create, rename
  columnValues?: Record<string, any> // For create, update
}
