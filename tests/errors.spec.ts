import {
  MondayError,
  QuerySyntaxError,
  MondayApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  ParseError
} from '../src/errors'

describe('MondayError', () => {
  it('sets name, message, and code', () => {
    const err = new MondayError('something failed', 'SOME_CODE')
    expect(err.name).toBe('MondayError')
    expect(err.message).toBe('something failed')
    expect(err.code).toBe('SOME_CODE')
  })

  it('stores optional details', () => {
    const err = new MondayError('msg', 'CODE', { foo: 'bar' })
    expect(err.details).toEqual({ foo: 'bar' })
  })

  it('is an instance of Error', () => {
    expect(new MondayError('m', 'C')).toBeInstanceOf(Error)
  })

  it('toJSON returns a structured object', () => {
    const err = new MondayError('msg', 'CODE', { x: 1 })
    expect(err.toJSON()).toEqual({ name: 'MondayError', message: 'msg', code: 'CODE', details: { x: 1 } })
  })
})

describe('QuerySyntaxError', () => {
  const err = new QuerySyntaxError('bad query', 'query { }', [{ message: 'syntax error' }])

  it('name is QuerySyntaxError, code is QUERY_SYNTAX_ERROR', () => {
    expect(err.name).toBe('QuerySyntaxError')
    expect(err.code).toBe('QUERY_SYNTAX_ERROR')
  })

  it('exposes query and errors fields', () => {
    expect(err.query).toBe('query { }')
    expect(err.errors).toEqual([{ message: 'syntax error' }])
  })

  it('is instanceof MondayError and Error', () => {
    expect(err).toBeInstanceOf(MondayError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('MondayApiError', () => {
  const err = new MondayApiError('api error', 'InvalidColumnIdException', { column_type: 'text' })

  it('name is MondayApiError, code is MONDAY_API_ERROR', () => {
    expect(err.name).toBe('MondayApiError')
    expect(err.code).toBe('MONDAY_API_ERROR')
  })

  it('exposes errorCode and errorData', () => {
    expect(err.errorCode).toBe('InvalidColumnIdException')
    expect(err.errorData).toEqual({ column_type: 'text' })
  })

  it('is instanceof MondayError', () => {
    expect(err).toBeInstanceOf(MondayError)
  })
})

describe('NetworkError', () => {
  it('name is NetworkError, code is NETWORK_ERROR', () => {
    expect(new NetworkError('timeout').name).toBe('NetworkError')
    expect(new NetworkError('timeout').code).toBe('NETWORK_ERROR')
  })

  it('stores statusCode and originalError', () => {
    const cause = new Error('socket hang up')
    const err = new NetworkError('failed', 503, cause)
    expect(err.statusCode).toBe(503)
    expect(err.originalError).toBe(cause)
  })

  it('is instanceof MondayError', () => {
    expect(new NetworkError('x')).toBeInstanceOf(MondayError)
  })
})

describe('ValidationError', () => {
  it('name is ValidationError, code is VALIDATION_ERROR', () => {
    const err = new ValidationError('invalid email', 'email', 'not-an-email')
    expect(err.name).toBe('ValidationError')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.field).toBe('email')
    expect(err.value).toBe('not-an-email')
  })
})

describe('AuthenticationError', () => {
  it('uses default message', () => {
    const err = new AuthenticationError()
    expect(err.name).toBe('AuthenticationError')
    expect(err.code).toBe('AUTHENTICATION_ERROR')
    expect(err.message).toBe('Invalid or missing authentication token')
  })

  it('accepts a custom message', () => {
    expect(new AuthenticationError('token expired').message).toBe('token expired')
  })
})

describe('RateLimitError', () => {
  it('name is RateLimitError, code is RATE_LIMIT_ERROR, exposes retryAfter', () => {
    const err = new RateLimitError('too many requests', 60)
    expect(err.name).toBe('RateLimitError')
    expect(err.code).toBe('RATE_LIMIT_ERROR')
    expect(err.retryAfter).toBe(60)
  })
})

describe('ParseError', () => {
  it('name is ParseError, code is PARSE_ERROR, exposes data', () => {
    const err = new ParseError('unexpected shape', { raw: true })
    expect(err.name).toBe('ParseError')
    expect(err.code).toBe('PARSE_ERROR')
    expect(err.data).toEqual({ raw: true })
  })
})
