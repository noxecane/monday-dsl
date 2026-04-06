/**
 * Monday.com Query Library - Client Interface
 *
 * Self-contained client interface - no dependencies on old code
 */

import FormData from 'form-data'
import { injectable } from 'inversify'
import fetch, { Response } from 'node-fetch'

import {
  AuthenticationError,
  MondayApiError,
  NetworkError,
  ParseError,
  QuerySyntaxError,
  RateLimitError
} from './errors'

export interface MondayUpload {
  name: string
  type: string
  file: Buffer
}

/**
 * Monday.com GraphQL client interface
 * The query library only needs the run() method
 */
export interface MondayClient {
  /**
   * Execute a GraphQL query against Monday.com API
   * @param query - GraphQL query string
   * @param mode - Optional mode for debugging or dry run
   * @returns Promise with typed response data
   * @throws {QuerySyntaxError} When GraphQL query has syntax errors
   * @throws {MondayApiError} When Monday.com API returns an error
   * @throws {NetworkError} When network request fails
   * @throws {AuthenticationError} When authentication fails
   * @throws {RateLimitError} When rate limit is exceeded
   */
  run<T>(query: string, mode?: 'debug' | 'dry'): Promise<T>

  /**
   * Upload a file to a Monday.com item column
   * @param item - Item ID to attach file to
   * @param columnID - Column ID where file should be uploaded
   * @param upload - File upload details (name, type, buffer)
   * @returns Promise with typed response data
   * @throws {QuerySyntaxError} When mutation has syntax errors
   * @throws {MondayApiError} When Monday.com API returns an error
   * @throws {NetworkError} When network request fails
   * @throws {ValidationError} When upload parameters are invalid
   */
  upload<T>(item: string, columnID: string, upload: MondayUpload): Promise<T>
}

/**
 * Monday.com API response structure for boards query
 */
export type Objects<key extends string, T> = {
  [K in key]: T[]
}

/**
 * Monday.com board structure
 */
export interface Board {
  id?: string
  name?: string
  items_page?: {
    cursor?: string
    items: RawItem[]
  }
}

/**
 * Raw item from Monday.com API
 */
export interface RawItem {
  id?: string
  name?: string
  created_at?: string
  column_values?: ColumnValue[]
}

/**
 * Raw column value from Monday.com API
 */
export interface ColumnValue {
  id: string
  value?: string
  text?: string
  [key: string]: any
}

/**
 * Concrete implementation of MondayClient using fetch
 * Provides comprehensive error handling and validation
 * TODO: rewrite the monday client to use HTTP agent. Also use that chance to review error handling.
 */
@injectable()
export class MondayFetchClient implements MondayClient {
  constructor(private readonly url: string, private readonly token: string) {}

  /**
   * Upload a file to Monday.com item column
   */
  async upload<T>(item: string, columnID: string, upload: MondayUpload): Promise<T> {
    const query = `mutation add_file($file: File!) {
      add_file_to_column (item_id: ${item}, column_id: "${columnID}", file: $file) {
        id
      }
    }`

    const form = new FormData()
    form.append('query', query)
    form.append('map', JSON.stringify({ file: 'variables.file' }))
    form.append('file', upload.file, { filename: upload.name, contentType: upload.type })

    let res: Response
    try {
      res = await fetch(`${this.url}/file`, {
        method: 'POST',
        headers: {
          Authorization: this.token
        },
        body: form as any
      })
    } catch (err) {
      throw new NetworkError('Failed to connect to Monday.com API', undefined, err as Error)
    }

    // Check HTTP status before parsing
    await this.checkHttpStatus(res)

    let resData: any
    try {
      resData = await res.json()
    } catch (err) {
      throw new ParseError('Failed to parse Monday.com API response as JSON', await res.text())
    }

    // Handle GraphQL/Monday errors
    this.handleError(resData, query)

    // Validate response structure
    if (!resData.data) {
      throw new ParseError('Monday.com API response missing data field', resData)
    }

    return resData.data
  }

  /**
   * Execute GraphQL query against Monday.com API
   */
  async run<T>(query: string, mode?: 'debug' | 'dry'): Promise<T> {
    // Debug/dry run modes
    if (mode) {
      console.log(query)
      if (mode === 'dry') return {} as T
    }

    let res: Response
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.token
        },
        body: JSON.stringify({ query })
      })
    } catch (err) {
      throw new NetworkError('Failed to connect to Monday.com API', undefined, err as Error)
    }

    // Check HTTP status before parsing
    await this.checkHttpStatus(res)

    let resData: any
    try {
      resData = await res.json()
    } catch (err) {
      throw new ParseError('Failed to parse Monday.com API response as JSON', await res.text())
    }

    // Handle GraphQL/Monday errors
    this.handleError(resData, query)

    // Validate response structure
    if (!resData.data) {
      throw new ParseError('Monday.com API response missing data field', resData)
    }

    return resData.data
  }

  /**
   * Check HTTP response status and throw appropriate errors
   */
  private async checkHttpStatus(res: Response): Promise<void> {
    if (res.ok) return

    const statusCode = res.status
    let errorBody: string
    try {
      errorBody = await res.text()
    } catch {
      errorBody = 'Unable to read error response'
    }

    // Handle specific HTTP status codes
    switch (statusCode) {
      case 401:
      case 403:
        throw new AuthenticationError(`Authentication failed: ${errorBody}`)

      case 429:
        const retryAfter = res.headers.get('retry-after')
        throw new RateLimitError(
          'Rate limit exceeded. Please wait before retrying.',
          retryAfter ? parseInt(retryAfter, 10) : undefined
        )

      case 500:
      case 502:
      case 503:
      case 504:
        throw new NetworkError(`Monday.com API server error (${statusCode})`, statusCode)

      default:
        throw new NetworkError(`HTTP request failed with status ${statusCode}: ${errorBody}`, statusCode)
    }
  }

  /**
   * Handle GraphQL and Monday.com API errors from response body
   */
  private handleError(resData: any, query: string): void {
    // GraphQL syntax errors
    if (resData.errors && Array.isArray(resData.errors)) {
      const errorMessages = resData.errors.map((e: any) => e.message || JSON.stringify(e)).join('; ')
      throw new QuerySyntaxError(`GraphQL query syntax error: ${errorMessages}`, query, resData.errors)
    }

    // Monday.com API errors
    if (resData.error_message) {
      throw new MondayApiError(
        resData.error_message,
        resData.error_code || 'UNKNOWN_ERROR',
        resData.error_data
          ? {
              column_value: resData.error_data.column_value,
              column_type: resData.error_data.column_type,
              ...resData.error_data
            }
          : undefined
      )
    }

    // Check for other error indicators
    if (resData.error) {
      throw new MondayApiError(
        typeof resData.error === 'string' ? resData.error : 'Unknown Monday.com API error',
        'MONDAY_API_ERROR',
        resData
      )
    }
  }
}
