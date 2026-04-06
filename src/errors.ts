/**
 * Monday.com v3 Query Library - Error Types
 *
 * Custom error classes for better error handling and debugging
 */

/**
 * Base error class for all Monday.com library errors
 */
export class MondayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message)
    this.name = 'MondayError'
    Object.setPrototypeOf(this, MondayError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details
    }
  }
}

/**
 * Error thrown when GraphQL query has syntax errors
 */
export class QuerySyntaxError extends MondayError {
  constructor(
    message: string,
    public readonly query: string,
    public readonly errors: any[]
  ) {
    super(message, 'QUERY_SYNTAX_ERROR', { query, errors })
    this.name = 'QuerySyntaxError'
    Object.setPrototypeOf(this, QuerySyntaxError.prototype)
  }
}

/**
 * Error thrown when Monday.com API returns an error
 */
export class MondayApiError extends MondayError {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly errorData?: {
      column_value?: any
      column_type?: string
      [key: string]: any
    }
  ) {
    super(message, 'MONDAY_API_ERROR', { errorCode, errorData })
    this.name = 'MondayApiError'
    Object.setPrototypeOf(this, MondayApiError.prototype)
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends MondayError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message, 'NETWORK_ERROR', { statusCode, originalError: originalError?.message })
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Error thrown when mutation validation fails
 */
export class ValidationError extends MondayError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any
  ) {
    super(message, 'VALIDATION_ERROR', { field, value })
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends MondayError {
  constructor(message: string = 'Invalid or missing authentication token') {
    super(message, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends MondayError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter })
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Error thrown when response parsing fails
 */
export class ParseError extends MondayError {
  constructor(
    message: string,
    public readonly data?: any
  ) {
    super(message, 'PARSE_ERROR', { data })
    this.name = 'ParseError'
    Object.setPrototypeOf(this, ParseError.prototype)
  }
}
