/**
 * Monday.com Query Library - Response Parser
 *
 * Parses Monday.com API responses to typed objects
 */

import { ColumnValue, RawItem } from './client'
import { BoardSchema, ColumnDefinition, SelectionMap } from './types'

/**
 * Parse Monday.com raw item to typed object
 */
export class ResponseParser<TSchema extends BoardSchema> {
  constructor(private schema: TSchema) {}

  /**
   * Parse a single item
   */
  parse<TSelection extends SelectionMap<TSchema>>(
    rawItem: RawItem,
    selection: TSelection
  ): { id: string; name: string } & Partial<{ [K in keyof TSelection]: any }> {
    const result: any = {
      id: rawItem.id,
      name: rawItem.name
    }

    if (!rawItem.column_values) {
      return result
    }

    // Create map of column_id -> column_value for faster lookup
    const columnMap = new Map<string, ColumnValue>()
    for (const col of rawItem.column_values) {
      columnMap.set(col.id, col)
    }

    // Parse selected columns
    for (const key of Object.keys(selection)) {
      if (!selection[key]) continue

      const colDef = this.schema[key]
      if (!colDef) continue

      const columnValue = columnMap.get(colDef.id)
      if (!columnValue) continue

      result[key] = this.parseColumnValue(columnValue, colDef, key, selection)
    }

    return result
  }

  /**
   * Parse array of items
   */
  parseMany<TSelection extends SelectionMap<TSchema>>(
    rawItems: RawItem[],
    selection: TSelection
  ): Array<{ id: string; name: string } & Partial<{ [K in keyof TSelection]: any }>> {
    return rawItems.map(item => this.parse(item, selection))
  }

  /**
   * Parse a single column value based on its type
   */
  private parseColumnValue(
    columnValue: ColumnValue,
    colDef: ColumnDefinition,
    key: string,
    selection: SelectionMap<TSchema>
  ): any {
    const { type, is_mirror: isMirror, is_number: isNumber } = colDef

    // Handle mirror columns
    if (isMirror) {
      return ResponseParser.parseMirrorValue(columnValue, isNumber)
    }

    // Handle different column types
    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
        return isNumber ? ResponseParser.parseNumber(columnValue.text) : columnValue.text || ''

      case 'number':
        return ResponseParser.parseNumber(columnValue.text)

      case 'date':
        return ResponseParser.parseDateString(columnValue)

      case 'time':
        return ResponseParser.parseTimeString(columnValue)

      case 'iso':
        return ResponseParser.parseDate(columnValue)

      case 'status':
        return ResponseParser.parseStatus(columnValue)

      case 'dropdown':
        return ResponseParser.parseDropdown(columnValue)

      case 'people':
        return ResponseParser.parsePeople(columnValue)

      case 'url':
        return ResponseParser.parseUrl(columnValue)

      case 'connect':
        const selectionValue = selection[key]
        const nestedSelection =
          selectionValue && typeof selectionValue === 'object' && !Array.isArray(selectionValue)
            ? (selectionValue as SelectionMap<any>)
            : undefined
        return ResponseParser.parseConnect(columnValue, colDef.linked_schema, nestedSelection)

      case 'asset':
        return ResponseParser.parseAsset(columnValue)

      case 'tag':
        return ResponseParser.parseTag(columnValue)

      case 'mirror':
        return columnValue.text || ''

      default:
        return columnValue.text || ''
    }
  }

  /**
   * Parse mirror column value
   */
  static parseMirrorValue(columnValue: ColumnValue, isNumber?: boolean): any {
    const displayValue = (columnValue as any).display_value || columnValue.text || ''
    return isNumber ? ResponseParser.parseNumber(displayValue) : displayValue
  }

  /**
   * Parse text to number
   */
  static parseNumber(text: string | undefined | null): number {
    if (!text) return 0
    const num = parseFloat(text)
    return isNaN(num) ? 0 : num
  }

  /**
   * Parse date column
   */
  static parseDateString(columnValue: ColumnValue): string {
    return (columnValue as any).date || ''
  }

  /**
   * Parse time column
   */
  static parseTimeString(columnValue: ColumnValue): string {
    return (columnValue as any).time || ''
  }

  /**
   * Parse ISO date to Date object (legacy compatibility)
   */
  static parseDate(columnValue: ColumnValue): Date | null {
    const dateStr = (columnValue as any).date || (columnValue as any).time || columnValue.text
    return dateStr ? new Date(dateStr) : null
  }

  /**
   * Parse status column
   */
  static parseStatus(columnValue: ColumnValue): { label: string; index?: number } | null {
    const status = (columnValue as any).label
    if (typeof status === 'string') {
      return { label: status }
    }
    if (status && typeof status === 'object') {
      return { label: status.text || status.label || '', index: status.index }
    }
    return null
  }

  /**
   * Parse dropdown column
   */
  static parseDropdown(columnValue: ColumnValue): string[] {
    const values = (columnValue as any).values
    if (!values || !Array.isArray(values)) return []
    return values.map((v: any) => v.label || v.text || String(v))
  }

  /**
   * Parse people column
   */
  static parsePeople(columnValue: ColumnValue): Array<{ id: string; kind: string }> {
    const persons = (columnValue as any).persons_and_teams
    if (!persons || !Array.isArray(persons)) return []
    return persons.map((p: any) => ({
      id: p.id,
      kind: p.kind
    }))
  }

  /**
   * Parse URL column
   */
  static parseUrl(columnValue: ColumnValue): { url: string; text: string } {
    const urlData = columnValue as any
    return {
      url: urlData.url || '',
      text: urlData.url_text || urlData.text || ''
    }
  }

  /**
   * Parse connect column (board relation)
   */
  static parseConnect<TLinkedSchema extends BoardSchema>(
    columnValue: ColumnValue,
    linkedSchema?: TLinkedSchema,
    nestedSelection?: SelectionMap<TLinkedSchema>
  ): string[] | Array<any> {
    // Check for expanded mode first (linked_items with nested data)
    const linkedItems = (columnValue as any).linked_items
    if (linkedItems && Array.isArray(linkedItems) && linkedSchema && nestedSelection) {
      const parser = new ResponseParser(linkedSchema)
      return linkedItems.map((item: any) => {
        return parser.parse(item, nestedSelection)
      })
    }

    // Fallback to simple mode (IDs only)
    const linkedIds = (columnValue as any).linked_item_ids
    if (!linkedIds || !Array.isArray(linkedIds)) return []
    return linkedIds.map(String)
  }

  /**
   * Parse asset/file column
   */
  static parseAsset(columnValue: ColumnValue): Array<{ name: string; url: string }> {
    const files = (columnValue as any).files
    if (!files || !Array.isArray(files)) return []
    return files.map((f: any) => ({
      name: f.name || '',
      url: f.asset?.public_url || ''
    }))
  }

  /**
   * Parse tag column
   */
  static parseTag(columnValue: ColumnValue): string[] {
    const tagIds = (columnValue as any).tag_ids
    const text = columnValue.text
    if (text) {
      return text
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    }
    return tagIds || []
  }

  /**
   * Parse webhook columnValues using schema for type inference
   * Webhook format differs from GraphQL but represents the same column types
   */
  static parseWebhookColumnValues<TSchema extends BoardSchema>(columnVals: any, schema: TSchema): Record<string, any> {
    if (!columnVals) return {}

    // Build reverse index: Monday column ID -> our property name
    const columnIdToPropertyName = new Map<string, string>()
    for (const [propertyName, colDef] of Object.entries(schema)) {
      columnIdToPropertyName.set(colDef.id, propertyName)
    }

    const result: Record<string, any> = {}
    for (const [mondayColumnId, val] of Object.entries(columnVals)) {
      const propertyName = columnIdToPropertyName.get(mondayColumnId)
      if (propertyName) {
        const colDef = schema[propertyName]
        result[propertyName] = ResponseParser.parseWebhookColumnValue(val, colDef)
      } else {
        // Column not in schema, store with Monday ID as key
        result[mondayColumnId] = ResponseParser.parseWebhookColumnValue(val, undefined)
      }
    }

    return result
  }

  /**
   * Parse a single webhook column value
   * Can work with or without schema definition for type hints
   */
  private static parseWebhookColumnValue(val: any, colDef?: ColumnDefinition): any {
    // Use schema type if available
    if (colDef) {
      switch (colDef.type) {
        case 'status':
          return ResponseParser.parseStatus(val)
        case 'dropdown':
          return ResponseParser.parseDropdown(val)
        case 'date':
        case 'time':
          return ResponseParser.parseDate(val)
        case 'people':
          return ResponseParser.parsePeople(val)
        case 'connect':
          return ResponseParser.parseConnect(val)
        case 'url':
          return ResponseParser.parseUrl(val)
        case 'asset':
          return ResponseParser.parseAsset(val)
        case 'tag':
          return ResponseParser.parseTag(val)
        case 'email':
        case 'phone':
        case 'text':
          return val.email || val.text || val.value || val
        case 'number':
          return ResponseParser.parseNumber(val.value || val.text)
        default:
          return val.value || val.text || val
      }
    }

    // Infer from structure when no schema
    if (val.label) {
      return ResponseParser.parseStatus(val)
    } else if (val.chosenValues) {
      return ResponseParser.parseDropdown(val)
    } else if (val.date) {
      return ResponseParser.parseDate(val)
    } else if (val.email) {
      return val.email
    } else if (val.value !== undefined) {
      return val.value
    } else {
      return val
    }
  }
}
