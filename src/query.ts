/**
 * Monday.com Query Library - Query Builder
 *
 * Chainable query builder for Monday.com boards
 */

import { Board, MondayClient, Objects } from './client'
import { columns } from './fragments'
import { GraphQLBuilder } from './graphql'
import { ResponseParser } from './parser'
import {
  BoardSchema,
  FilterRule,
  ItemFromSchema,
  PageResult,
  QueryOptions,
  QueryState,
  SelectionMap,
  WithGroup
} from './types'

/**
 * Chainable query builder for a Monday.com board
 */
export class BoardQuery<TSchema extends BoardSchema> {
  private state: QueryState = {
    filters: []
  }

  constructor(
    private boardId: string,
    private client: MondayClient,
    private schema: TSchema
  ) {}

  /**
   * Filter: any_of - Match if column value is in the provided array
   * Common for ID lookups, email matching, etc.
   */
  anyOf<K extends keyof TSchema>(column: K, values: string[] | number[]): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'any_of',
      compare_value: values
    })
    return this
  }

  /**
   * Filter: not_any_of - Match if column value is NOT in the provided array
   * Useful for exclusion queries
   */
  notAnyOf<K extends keyof TSchema>(column: K, values: string[]): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'not_any_of',
      compare_value: values
    })
    return this
  }

  /**
   * Filter: contains_terms - Match if column contains the search term
   * Common for text search, status label matching
   */
  contains<K extends keyof TSchema>(column: K, value: string): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'contains_terms',
      compare_value: value
    })
    return this
  }

  /**
   * Filter: equals - Exact match (implemented via any_of with single value)
   */
  equals<K extends keyof TSchema>(column: K, value: string): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'any_of',
      compare_value: [value]
    })
    return this
  }

  /**
   * Filter: greater_than - Column value > compare value
   * Works with numbers and dates
   */
  greaterThan<K extends keyof TSchema>(column: K, value: number | Date): this {
    const compareValue = value instanceof Date ? this.formatDate(value) : String(value)
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'greater_than',
      compare_value: compareValue,
      ...(value instanceof Date ? { compare_attribute: 'DATE' } : {})
    })
    return this
  }

  /**
   * Filter: greater_than_or_equals - Column value >= compare value
   * Works with numbers and dates
   */
  greaterThanOrEquals<K extends keyof TSchema>(column: K, value: number | Date): this {
    const compareValue = value instanceof Date ? this.formatDate(value) : String(value)
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'greater_than_or_equals',
      compare_value: compareValue,
      ...(value instanceof Date ? { compare_attribute: 'DATE' } : {})
    })
    return this
  }

  /**
   * Filter: lower_than - Column value < compare value
   * Works with numbers and dates
   */
  lessThan<K extends keyof TSchema>(column: K, value: number | Date): this {
    const compareValue = value instanceof Date ? this.formatDate(value) : String(value)
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'lower_than',
      compare_value: compareValue,
      ...(value instanceof Date ? { compare_attribute: 'DATE' } : {})
    })
    return this
  }

  /**
   * Filter: lower_than_or_equals - Column value <= compare value
   * Works with numbers and dates
   */
  lessThanOrEquals<K extends keyof TSchema>(column: K, value: number | Date): this {
    const compareValue = value instanceof Date ? this.formatDate(value) : String(value)
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'lower_than_or_equals',
      compare_value: compareValue,
      ...(value instanceof Date ? { compare_attribute: 'DATE' } : {})
    })
    return this
  }

  /**
   * Filter: between - Column value is between two values
   * Works with numbers and dates
   */
  between<K extends keyof TSchema>(column: K, start: number | Date, end: number | Date): this {
    const startValue = start instanceof Date ? this.formatDate(start) : String(start)
    const endValue = end instanceof Date ? this.formatDate(end) : String(end)
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'between',
      compare_value: [startValue, endValue],
      ...(start instanceof Date ? { compare_attribute: 'DATE' } : {})
    })
    return this
  }

  /**
   * Filter: is_empty - Match if column value is empty
   * Works with text, email, phone, connect, and other nullable columns
   */
  isEmpty<K extends keyof TSchema>(column: K): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'is_empty'
    })
    return this
  }

  /**
   * Filter: is_not_empty - Match if column value is NOT empty
   * Works with text, email, phone, connect, and other nullable columns
   */
  isNotEmpty<K extends keyof TSchema>(column: K): this {
    this.addFilter({
      column_id: this.schema[column].id,
      operator: 'is_not_empty'
    })
    return this
  }

  /**
   * Set limit for number of items returned
   */
  limit(count: number): this {
    this.state.limit = count
    return this
  }

  /**
   * Set cursor for pagination
   */
  cursor(cursor: string): this {
    this.state.cursor = cursor
    return this
  }

  /**
   * Filter items to one or more groups by group ID
   */
  inGroup(...groupIds: string[]): this {
    this.state.groupIds = groupIds
    return this
  }

  /**
   * Order results by column
   */
  orderBy<K extends keyof TSchema>(column: K, direction: 'asc' | 'desc' = 'desc'): this {
    this.state.orderBy = {
      column_id: this.schema[column]?.id ?? String(column),
      direction
    }
    return this
  }

  /**
   * Execute query and return selected columns
   * Terminal operation - returns results
   */
  async returning<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    selection: TSelection,
    options?: TOptions
  ): Promise<Array<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>>> {
    const query = GraphQLBuilder.buildQuery(this.boardId, this.schema, this.state, selection, options)
    const data = await this.client.run<Objects<'boards', Board>>(query)
    const items = this.extractItems(data)
    const parser = new ResponseParser(this.schema)
    return parser.parseMany(items, selection) as Array<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>>
  }

  /**
   * Execute query and return first result or null
   * Terminal operation - returns single result
   */
  async first<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    selection: TSelection,
    options?: TOptions
  ): Promise<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions> | null> {
    this.state.limit = 1
    const results = await this.returning(selection, options)
    return results.length > 0 ? results[0] : null
  }

  /**
   * Execute query and return all results with pagination
   * Terminal operation - returns all results across pages
   */
  async all<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    selection: TSelection,
    maxPages: number = 10,
    options?: TOptions
  ): Promise<Array<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>>> {
    const allItems: Array<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>> = []
    let currentCursor: string | undefined = this.state.cursor
    let pageCount = 0

    while (pageCount < maxPages) {
      this.state.cursor = currentCursor
      const query = GraphQLBuilder.buildQuery(this.boardId, this.schema, this.state, selection, options)
      const data = await this.client.run<Objects<'boards', Board>>(query)

      const itemsPage = this.extractItemsPage(data)
      if (!itemsPage?.items || itemsPage.items.length === 0) break

      const parser = new ResponseParser(this.schema)
      const parsed = parser.parseMany(itemsPage.items, selection) as Array<
        WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>
      >
      allItems.push(...parsed)

      if (!itemsPage.cursor) break
      currentCursor = itemsPage.cursor
      pageCount++
    }

    return allItems
  }

  /**
   * Execute query and return a single page with pagination metadata
   * Terminal operation - returns page result with cursor
   */
  async page<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    selection: TSelection,
    options?: TOptions
  ): Promise<PageResult<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>>> {
    const query = GraphQLBuilder.buildQuery(this.boardId, this.schema, this.state, selection, options)
    const data = await this.client.run<Objects<'boards', Board>>(query)
    const itemsPage = this.extractItemsPage(data)
    const items = itemsPage?.items || []
    const parser = new ResponseParser(this.schema)
    const parsedItems = parser.parseMany(items, selection) as Array<
      WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>
    >
    return {
      items: parsedItems,
      cursor: itemsPage?.cursor,
      hasMore: !!itemsPage?.cursor
    }
  }

  /**
   * Create an async iterator for paginating through results
   * Terminal operation - returns async generator for lazy pagination
   *
   * @example
   * ```typescript
   * for await (const page of board.query().paginate({ email: true })) {
   *   console.log(`Processing ${page.items.length} items`)
   *   if (!page.hasMore) break
   * }
   * ```
   */
  async *paginate<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    selection: TSelection,
    maxPages: number = Infinity,
    options?: TOptions
  ): AsyncGenerator<PageResult<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>>, void, unknown> {
    let pageCount = 0
    let currentCursor: string | undefined = this.state.cursor

    while (pageCount < maxPages) {
      this.state.cursor = currentCursor
      const pageResult = await this.page(selection, options)
      yield pageResult
      if (!pageResult.hasMore) break
      currentCursor = pageResult.cursor
      pageCount++
    }
  }

  /**
   * Get item by ID
   * Terminal operation - returns single result
   */
  async getById<TSelection extends SelectionMap<TSchema>, TOptions extends QueryOptions = {}>(
    itemId: string,
    selection: TSelection,
    options?: TOptions
  ): Promise<WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions> | null> {
    const selectedKeys = Object.keys(selection).filter(k => selection[k])
    const columnIds = selectedKeys.map(key => this.schema[key].id)
    const columnFragments = GraphQLBuilder.buildColumnFragments(
      this.schema,
      selectedKeys as (keyof TSchema)[],
      selection
    )
    const groupField = options?.includeGroup ? 'group { id title position archived }' : ''

    const query = `{
      items(ids: ${itemId}) {
        id
        name
        ${groupField}
        column_values(ids: ${columns(...columnIds)}) {
          id
          text
          value
          ${columnFragments}
        }
      }
    }`

    const data = await this.client.run<{ items: any[] }>(query)
    if (!data.items || data.items.length === 0) return null

    const parser = new ResponseParser(this.schema)
    return parser.parse(data.items[0], selection) as WithGroup<ItemFromSchema<TSchema, TSelection>, TOptions>
  }

  /**
   * Extract items_page from the API response, handling both board-level
   * and group-level response shapes
   */
  private extractItemsPage(data: Objects<'boards', Board>): { cursor?: string; items: any[] } | undefined {
    const board = data.boards?.[0]
    if (!board) return undefined
    if (this.state.groupIds && this.state.groupIds.length > 0) {
      // Flatten items_page across all matched groups; use cursor from last group
      // (pagination across multiple groups is not natively supported by the API —
      // each group's items_page is independent, so we merge them into one page)
      const groups = board.groups || []
      const allItems = groups.flatMap(g => g.items_page?.items || [])
      const cursor = groups.length > 0 ? groups[groups.length - 1].items_page?.cursor : undefined
      return { cursor, items: allItems }
    }
    return board.items_page
  }

  /**
   * Extract flat item array from response (used by returning())
   */
  private extractItems(data: Objects<'boards', Board>): any[] {
    return this.extractItemsPage(data)?.items || []
  }

  /**
   * Add filter to query state
   */
  private addFilter(filter: FilterRule): void {
    this.state.filters.push(filter)
  }

  /**
   * Format Date for Monday.com queries
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}
