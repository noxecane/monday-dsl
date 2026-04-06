/**
 * Monday.com Query Library - Mutation Builder
 *
 * Chainable mutation builder for Monday.com boards - batches mutations by default
 */

import { MondayClient } from './client'
import { GraphQLBuilder } from './graphql'
import { ResponseParser } from './parser'
import { BoardSchema, CreateItemInput, ItemFromSchema, MutationOperation, SelectionMap, UpdateItemInput } from './types'

/**
 * Chainable mutation builder for a Monday.com board
 *
 * @example
 * ```typescript
 * const results = await board.mutate()
 *   .create({ name: 'Item 1', status: 'Done' })
 *   .create({ name: 'Item 2', status: 'Pending' })
 *   .exec({ id: true, name: true, status: true })
 * ```
 */
export class BoardMutation<TSchema extends BoardSchema> {
  private operations: MutationOperation[] = []
  private operationCounter = 0

  constructor(private boardId: string, private client: MondayClient, private schema: TSchema) {}

  /**
   * Create a new item with column values
   * Accumulates mutation - does not execute immediately
   */
  create(input: CreateItemInput<TSchema>): this {
    const { name, ...columnData } = input
    const columnValues = this.prepareColumnValues(columnData)

    this.operations.push({
      op: 'create',
      alias: `op${this.operationCounter++}`,
      name,
      columnValues
    })

    return this
  }

  /**
   * Update an item's column values
   */
  update(itemId: string, input: UpdateItemInput<TSchema>): this {
    const { name, ...columnData } = input
    const columnValues = this.prepareColumnValues(columnData)

    // If name is provided, split into update + rename
    if (name !== undefined && Object.keys(columnValues).length > 0) {
      // Update columns first
      this.operations.push({
        op: 'update',
        alias: `op${this.operationCounter++}`,
        itemId,
        columnValues
      })
      // Then rename
      this.operations.push({
        op: 'rename',
        alias: `op${this.operationCounter++}`,
        itemId,
        name
      })
    } else if (name !== undefined) {
      // Only rename
      this.rename(itemId, name)
    } else {
      // Only update columns
      this.operations.push({
        op: 'update',
        alias: `op${this.operationCounter++}`,
        itemId,
        columnValues
      })
    }

    return this
  }

  /**
   * Update an item with raw column values (bypasses schema validation)
   * Useful for dynamic columns not defined in schema (e.g., timeline slots)
   *
   * @param itemId - Item ID to update
   * @param columnValues - Map of column_id -> value (raw Monday.com format)
   * @example
   * ```typescript
   * await board.mutation()
   *   .updateRaw('123', {
   *     'timeline_2026_0': { from: '2026-01-01', to: '2026-01-05' },
   *     'timeline_2026_1': { from: '2026-02-10', to: '2026-02-15' }
   *   })
   *   .exec()
   * ```
   */
  updateRaw(itemId: string, columnValues: Record<string, any>): this {
    this.operations.push({
      op: 'update',
      alias: `op${this.operationCounter++}`,
      itemId,
      columnValues
    })

    return this
  }

  /**
   * Rename an item (change name only)
   */
  rename(itemId: string, name: string): this {
    this.operations.push({
      op: 'rename',
      alias: `op${this.operationCounter++}`,
      itemId,
      name
    })

    return this
  }

  /**
   * Delete an item
   */
  delete(itemId: string): this {
    this.operations.push({
      op: 'delete',
      alias: `op${this.operationCounter++}`,
      itemId
    })

    return this
  }

  /**
   * Execute all accumulated mutations
   * Terminal operation - runs all mutations and returns the last operation's result
   *
   * @param selection - Optional selection map. Defaults to { id: true, name: true }
   * @returns The result of the last operation in the chain with proper type inference
   */
  async exec<TSelection extends SelectionMap<TSchema>>(
    selection?: TSelection
  ): Promise<ItemFromSchema<TSchema, TSelection> | null> {
    if (this.operations.length === 0) {
      return null
    }

    // Use default selection if none provided
    const actualSelection = selection || ({ id: true, name: true } as SelectionMap<TSchema>)

    // Build batched mutation query
    const mutationQuery = GraphQLBuilder.buildMutation(this.boardId, this.schema, this.operations, actualSelection)

    // Execute
    const result = await this.client.run<any>(mutationQuery)

    // Get the last operation's result
    const lastOp = this.operations[this.operations.length - 1]
    const opResult = result[lastOp.alias]

    if (!opResult) {
      return null
    }

    // Parse the result if custom selection is provided (works for all operations including delete)
    if (selection && Object.keys(selection).some(k => k !== 'id' && k !== 'name' && selection[k])) {
      const parser = new ResponseParser(this.schema)
      return parser.parse(opResult, actualSelection) as ItemFromSchema<TSchema, TSelection>
    }

    // Just id/name (works for all operations including delete)
    return { id: opResult.id, name: opResult.name } as ItemFromSchema<TSchema, TSelection>
  }

  /**
   * Prepare column values for mutations by converting to Monday.com format
   */
  private prepareColumnValues(data: any): Record<string, any> {
    const columnValues: Record<string, any> = {}

    for (const key in data) {
      const colDef = this.schema[key]
      if (!colDef) continue

      const value = data[key]
      if (value === undefined || value === null) continue

      columnValues[colDef.id] = this.formatValueForMutation(value, colDef.type)
    }

    return columnValues
  }

  /**
   * Format a value for Monday.com mutation based on column type
   */
  private formatValueForMutation(value: any, type: string): any {
    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
        return String(value)

      case 'number':
        return Number(value)

      case 'date':
      case 'time':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0] // YYYY-MM-DD
        }
        return String(value)

      case 'status':
        return { label: String(value) }

      case 'dropdown':
        return { labels: Array.isArray(value) ? value : [value] }

      case 'people':
        const personIds = Array.isArray(value) ? value : [value]
        return { personsAndTeams: personIds.map(id => ({ id: Number(id), kind: 'person' })) }

      case 'url':
        if (typeof value === 'object' && value.url) {
          return { url: value.url, text: value.text || value.url }
        }
        return { url: String(value), text: String(value) }

      case 'connect':
        return { item_ids: Array.isArray(value) ? value : [value] }

      case 'tag':
        return { tag_ids: Array.isArray(value) ? value : [value] }

      default:
        return value
    }
  }
}
