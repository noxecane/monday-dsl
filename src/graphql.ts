/**
 * Monday.com Query Library - GraphQL Generation
 *
 * Converts query state to Monday.com GraphQL queries
 */

import {
  assetColumn,
  columns,
  connectColumn,
  dateColumn,
  dropDownColumn,
  mirrorColumn,
  peopleColumn,
  statusColumn,
  tagColumn,
  urlColumn
} from './fragments'
import { BoardSchema, ColumnType, MutationOperation, QueryState, SelectionMap } from './types'

/**
 * Generate Monday.com GraphQL query from state
 */
export class GraphQLBuilder {
  /**
   * Build items_page query with filters
   */
  static buildQuery<TSchema extends BoardSchema>(
    boardId: string,
    schema: TSchema,
    state: QueryState,
    selection: SelectionMap<TSchema>
  ): string {
    const selectedKeys = Object.keys(selection).filter(k => selection[k])
    const columnIds = selectedKeys.map(key => schema[key].id)
    const columnFragments = this.buildColumnFragments(schema, selectedKeys as (keyof TSchema)[], selection)

    const queryParams = this.buildQueryParams(state)

    return `{
      boards(ids: ${boardId}) {
        items_page${queryParams} {
          cursor
          items {
            id
            name
            column_values(ids: ${columns(...columnIds)}) {
              id
              text
              value
              ${columnFragments}
            }
          }
        }
      }
    }`
  }

  /**
   * Build query_params section with filters and ordering
   * Supports and/or operator to combine multiple filter rules
   */
  private static buildQueryParams(state: QueryState): string {
    const parts: string[] = []

    if (state.filters.length > 0) {
      const rules = state.filters
        .map(filter => {
          const compareValue = this.formatCompareValue(filter.compare_value)
          const compareAttr = filter.compare_attribute ? `, compare_attribute: "${filter.compare_attribute}"` : ''
          return `{column_id: "${filter.column_id}", compare_value: ${compareValue}, operator: ${filter.operator}${compareAttr}}`
        })
        .join(', ')
      parts.push(`rules: [${rules}]`)

      // Add operator if specified (default is 'and' in Monday API)
      if (state.operator) {
        parts.push(`operator: ${state.operator}`)
      }
    }

    if (state.orderBy) {
      parts.push(`order_by: { column_id: "${state.orderBy.column_id}", direction: ${state.orderBy.direction} }`)
    }

    const queryParams = parts.length > 0 ? `query_params: { ${parts.join(', ')} }` : ''
    const limitParam = state.limit ? `limit: ${state.limit}` : ''
    const cursorParam = state.cursor ? `cursor: "${state.cursor}"` : ''

    const allParams = [queryParams, limitParam, cursorParam].filter(Boolean).join(', ')
    return allParams ? `(${allParams})` : ''
  }

  /**
   * Format compare_value for GraphQL
   */
  private static formatCompareValue(value: any): string {
    if (value === undefined || value === null) {
      return '""'
    }
    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        return `[${value.map(v => `"${this.escapeString(String(v))}"`).join(', ')}]`
      } else {
        return `[${value.join(',')}]`
      }
    }
    return `"${this.escapeString(String(value))}"`
  }

  /**
   * Escape string for GraphQL
   */
  private static escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }

  /**
   * Build column-specific GraphQL fragments
   */
  static buildColumnFragments<TSchema extends BoardSchema>(
    schema: TSchema,
    selectedKeys: (keyof TSchema)[],
    selection: SelectionMap<TSchema>
  ): string {
    const fragments = new Set<string>()

    for (const key of selectedKeys) {
      const colDef = schema[key]
      const selectionValue = selection[key]

      // Check if this is a nested selection for connect column
      const nestedSelection =
        colDef.type === 'connect' && typeof selectionValue === 'object' && !Array.isArray(selectionValue)
          ? selectionValue
          : undefined

      const fragment = this.getFragmentForType(colDef.type, colDef.linked_schema, nestedSelection)
      if (fragment) {
        fragments.add(fragment)
      }
    }

    return Array.from(fragments).join('\n')
  }

  /**
   * Get GraphQL fragment for column type
   */
  static getFragmentForType(
    type: ColumnType | string,
    linkedSchema?: BoardSchema,
    nestedSelection?: SelectionMap<any>
  ): string {
    switch (type) {
      case 'date':
        return dateColumn('date')
      case 'time':
        return dateColumn('time')
      case 'status':
        return statusColumn()
      case 'dropdown':
        return dropDownColumn()
      case 'people':
        return peopleColumn()
      case 'url':
        return urlColumn()
      case 'connect':
        if (!nestedSelection || !linkedSchema) {
          return connectColumn() // Simple mode: linked_item_ids
        }
        // Expanded mode: linked_items with column_values
        const selectedKeys = Object.keys(nestedSelection).filter(k => nestedSelection[k])
        const columnIds = selectedKeys.map(key => linkedSchema[key].id)
        const nestedFragments = this.buildColumnFragments(linkedSchema, selectedKeys, nestedSelection)
        return connectColumn(columnIds, nestedFragments)
      case 'asset':
        return assetColumn()
      case 'tag':
        return tagColumn()
      case 'mirror':
        // TODO: handle mirrorColumn fragment. see usage of mirrorColumn for examples
        return mirrorColumn()
      default:
        return '' // text, number, email, phone use text field
    }
  }

  /**
   * Format column values for mutations
   */
  private static formatColumnValues(columnValues: Record<string, any>): string {
    const sanitized = this.sanitize(columnValues)
    return `"${JSON.stringify(sanitized).replace(/"/g, '\\"')}"`
  }

  /**
   * Sanitize object for JSON encoding (remove null/undefined)
   */
  private static sanitize(obj: any): any {
    if (obj == null) {
      return null
    }

    if (Array.isArray(obj)) {
      return obj.reduce((a, b) => {
        const clean = this.sanitize(b)
        if (clean != null && !this.isEmpty(clean)) {
          a.push(clean)
        }
        return a
      }, [])
    } else if (typeof obj === 'object') {
      return Object.keys(obj).reduce((a, b) => {
        const clean = this.sanitize(obj[b])
        if (clean != null && !this.isEmpty(clean)) {
          a[b] = clean
        }
        return a
      }, {} as any)
    } else {
      return obj
    }
  }

  /**
   * Check if value is empty array or object
   */
  private static isEmpty(val: Array<any> | Object): boolean {
    return (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && Object.keys(val).length === 0)
  }

  /**
   * Build batched mutation query with custom selection per operation
   * Similar to buildQuery but for mutations
   */
  static buildMutation<TSchema extends BoardSchema>(
    boardId: string,
    schema: TSchema,
    operations: MutationOperation[],
    selection?: SelectionMap<TSchema>
  ): string {
    const mutations: string[] = []

    for (const op of operations) {
      mutations.push(this.buildSingleMutation(boardId, op, schema, selection))
    }

    return `mutation {\n${mutations.join('\n')}\n}`
  }

  /**
   * Build a single mutation operation with selection
   */
  private static buildSingleMutation<TSchema extends BoardSchema>(
    boardId: string,
    op: MutationOperation,
    schema: TSchema,
    selection?: SelectionMap<TSchema>
  ): string {
    const selectionFields = this.buildSelectionFields(schema, selection)

    switch (op.op) {
      case 'create':
        const createValues = this.formatColumnValues(op.columnValues || {})
        return `  ${op.alias}: create_item(board_id: ${boardId}, item_name: "${this.escapeString(
          op.name!
        )}", column_values: ${createValues}) ${selectionFields}`

      case 'update':
        const updateValues = this.formatColumnValues(op.columnValues || {})
        return `  ${op.alias}: change_multiple_column_values(board_id: ${boardId}, item_id: ${op.itemId}, column_values: ${updateValues}) ${selectionFields}`

      case 'rename':
        return `  ${op.alias}: change_simple_column_value(board_id: ${boardId}, item_id: ${
          op.itemId
        }, column_id: "name", value: "${this.escapeString(op.name!)}") ${selectionFields}`

      case 'delete':
        return `  ${op.alias}: delete_item(item_id: ${op.itemId}) ${selectionFields}`

      default:
        throw new Error(`Unknown mutation operation: ${(op as any).op}`)
    }
  }

  /**
   * Build selection fields for mutation result
   */
  private static buildSelectionFields<TSchema extends BoardSchema>(
    schema: TSchema,
    selection?: SelectionMap<TSchema>
  ): string {
    if (!selection) {
      return '{ id name }'
    }

    const selectedKeys = Object.keys(selection).filter(k => selection[k])
    const columnIds = selectedKeys.filter(k => k !== 'id' && k !== 'name').map(key => schema[key].id)

    if (columnIds.length === 0) {
      // Only id/name selected
      const fields = []
      if (selection.id) fields.push('id')
      if (selection.name) fields.push('name')
      return `{ ${fields.join(' ')} }`
    }

    // Need to fetch column_values
    const columnFragments = this.buildColumnFragments(schema, selectedKeys as (keyof TSchema)[], selection)

    return `{
      id
      name
      column_values(ids: ${columns(...columnIds)}) {
        id
        text
        value
        ${columnFragments}
      }
    }`
  }
}
