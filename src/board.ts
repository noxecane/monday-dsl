/**
 * Monday.com Query Library - Board Facade
 *
 * Main entry point for interacting with Monday.com boards
 */

import { MondayClient } from './client'
import { BoardMutation } from './mutation'
import { BoardQuery } from './query'
import { BoardSchema, ItemFromSchema, SelectionMap } from './types'

/**
 * Monday.com Board - Typed interface to a Monday board
 *
 * Provides type-safe access to Monday.com board data with:
 * - Query builder for filtering and selecting items
 * - Mutation builder for creating, updating, and deleting items
 * - Convenience methods for common operations (getById, findOne, findMany)
 *
 * @example
 * ```typescript
 * const schema = {
 *   email: { id: 'email_col', column_type: 'email' },
 *   status: { id: 'status_col', column_type: 'status' }
 * } as const
 *
 * const board = new MondayBoard(schema, '123456', client)
 *
 * // Query items
 * const items = await board.query()
 *   .contains('status', 'Approved')
 *   .returning({ email: true, status: true })
 *
 * // Create items
 * await board.mutation()
 *   .create('New Item', { status: 'Pending' })
 *   .exec()
 * ```
 */
export class MondayBoard<TSchema extends BoardSchema> {
  /**
   * Create a new board instance
   * @param boardId - Monday.com board ID
   * @param client - Monday.com GraphQL client for API communication
   * @param schema - Board schema defining column structure and types
   */
  constructor(protected boardId: string, protected client: MondayClient, protected schema: TSchema) {}

  /**
   * Start a new query on this board
   * @returns Chainable query builder for filtering and selecting items
   */
  query(): BoardQuery<TSchema> {
    return new BoardQuery<TSchema>(this.boardId, this.client, this.schema)
  }

  /**
   * Start a new mutation builder on this board
   * @returns Chainable mutation builder for creating/updating/deleting items
   */
  mutation(): BoardMutation<TSchema> {
    return new BoardMutation<TSchema>(this.boardId, this.client, this.schema)
  }

  /**
   * Get a single item by its ID
   * @param itemId - Monday.com item ID to fetch
   * @param selection - Map of columns to select (e.g., { email: true, status: true })
   * @returns Item with selected columns, or null if not found
   * @throws {Error} If no board ID is available
   */
  async getById<TSelection extends SelectionMap<TSchema>>(
    itemId: string,
    selection: TSelection
  ): Promise<ItemFromSchema<TSchema, TSelection> | null> {
    return this.query().getById(itemId, selection)
  }

  /**
   * Find the first item matching filter criteria
   * @param finder - Function that applies filters to query (e.g., q => q.contains('status', 'Approved'))
   * @param selection - Map of columns to select
   * @returns First matching item, or null if none found
   * @throws {Error} If no board ID is available
   *
   * @example
   * ```typescript
   * const item = await board.findOne(
   *   q => q.contains('status', 'Approved').greaterThan('date', new Date()),
   *   { email: true, status: true }
   * )
   * ```
   */
  async findOne<TSelection extends SelectionMap<TSchema>>(
    finder: (query: BoardQuery<TSchema>) => BoardQuery<TSchema>,
    selection: TSelection
  ): Promise<ItemFromSchema<TSchema, TSelection> | null> {
    const query = finder(this.query())
    return query.first(selection)
  }

  /**
   * Find all items matching filter criteria
   * @param finder - Function that applies filters to query
   * @param selection - Map of columns to select
   * @returns Array of matching items
   * @throws {Error} If no board ID is available
   *
   * @example
   * ```typescript
   * const items = await board.findMany(
   *   q => q.contains('status', 'Approved'),
   *   { email: true, status: true }
   * )
   * ```
   */
  async findMany<TSelection extends SelectionMap<TSchema>>(
    finder: (query: BoardQuery<TSchema>) => BoardQuery<TSchema>,
    selection: TSelection
  ): Promise<Array<ItemFromSchema<TSchema, TSelection>>> {
    const query = finder(this.query())
    return query.returning(selection)
  }
}
