import { ResponseParser } from '../src/parser'
import { BoardSchema } from '../src/types'

// ──────────────────────────────────────────────────────────────
// Static helpers — pure value transformations
// ──────────────────────────────────────────────────────────────

describe('ResponseParser.parseNumber', () => {
  it('parses a float string',       () => expect(ResponseParser.parseNumber('3.14')).toBe(3.14))
  it('parses an integer string',    () => expect(ResponseParser.parseNumber('42')).toBe(42))
  it('returns 0 for empty string',  () => expect(ResponseParser.parseNumber('')).toBe(0))
  it('returns 0 for null',          () => expect(ResponseParser.parseNumber(null)).toBe(0))
  it('returns 0 for undefined',     () => expect(ResponseParser.parseNumber(undefined)).toBe(0))
  it('returns 0 for non-numeric',   () => expect(ResponseParser.parseNumber('abc')).toBe(0))
})

describe('ResponseParser.parseDateString', () => {
  it('returns the date field', () => {
    expect(ResponseParser.parseDateString({ id: 'd', text: '', value: null, date: '2024-01-01' } as any)).toBe('2024-01-01')
  })

  it('returns empty string when date field is missing', () => {
    expect(ResponseParser.parseDateString({ id: 'd', text: '', value: null } as any)).toBe('')
  })
})

describe('ResponseParser.parseTimeString', () => {
  it('returns the time field', () => {
    expect(ResponseParser.parseTimeString({ id: 't', text: '', value: null, time: '10:30' } as any)).toBe('10:30')
  })

  it('returns empty string when time field is missing', () => {
    expect(ResponseParser.parseTimeString({ id: 't', text: '', value: null } as any)).toBe('')
  })
})

describe('ResponseParser.parseDate', () => {
  it('parses a date string into a Date object', () => {
    const result = ResponseParser.parseDate({ id: 'd', text: '2024-06-01', value: null } as any)
    expect(result).toBeInstanceOf(Date)
    expect(result!.getUTCFullYear()).toBe(2024)
    expect(result!.getUTCMonth()).toBe(5) // June
    expect(result!.getUTCDate()).toBe(1)
  })

  it('returns null for empty text', () => {
    expect(ResponseParser.parseDate({ id: 'd', text: '', value: null } as any)).toBeNull()
  })

  it('prefers the date field over text', () => {
    const result = ResponseParser.parseDate({ id: 'd', text: '2020-01-01', value: null, date: '2024-06-01' } as any)
    expect(result!.getUTCFullYear()).toBe(2024)
  })
})

describe('ResponseParser.parseStatus', () => {
  it('handles a string label', () => {
    expect(ResponseParser.parseStatus({ id: 's', text: '', value: null, label: 'Done' } as any)).toEqual({ label: 'Done' })
  })

  it('handles an object label with text and index', () => {
    expect(ResponseParser.parseStatus({ id: 's', text: '', value: null, label: { text: 'In Progress', index: 2 } } as any)).toEqual({ label: 'In Progress', index: 2 })
  })

  it('handles an object label with label property and index', () => {
    expect(ResponseParser.parseStatus({ id: 's', text: '', value: null, label: { label: 'Done', index: 1 } } as any)).toEqual({ label: 'Done', index: 1 })
  })

  it('returns null when label is missing', () => {
    expect(ResponseParser.parseStatus({ id: 's', text: '', value: null } as any)).toBeNull()
  })
})

describe('ResponseParser.parseDropdown', () => {
  it('parses an array of label objects', () => {
    const val = { id: 'd', text: '', value: null, values: [{ label: 'Option A' }, { label: 'Option B' }] } as any
    expect(ResponseParser.parseDropdown(val)).toEqual(['Option A', 'Option B'])
  })

  it('returns empty array when values is missing', () => {
    expect(ResponseParser.parseDropdown({ id: 'd', text: '', value: null } as any)).toEqual([])
  })

  it('returns empty array when values is null', () => {
    expect(ResponseParser.parseDropdown({ id: 'd', text: '', value: null, values: null } as any)).toEqual([])
  })
})

describe('ResponseParser.parsePeople', () => {
  it('parses a persons_and_teams array', () => {
    const val = { id: 'p', text: '', value: null, persons_and_teams: [{ id: '1', kind: 'person' }, { id: '2', kind: 'team' }] } as any
    expect(ResponseParser.parsePeople(val)).toEqual([{ id: '1', kind: 'person' }, { id: '2', kind: 'team' }])
  })

  it('returns empty array when field is missing', () => {
    expect(ResponseParser.parsePeople({ id: 'p', text: '', value: null } as any)).toEqual([])
  })
})

describe('ResponseParser.parseUrl', () => {
  it('returns url and url_text as text', () => {
    const val = { id: 'u', text: '', value: null, url: 'https://example.com', url_text: 'Example' } as any
    expect(ResponseParser.parseUrl(val)).toEqual({ url: 'https://example.com', text: 'Example' })
  })

  it('falls back to text field when url_text is missing', () => {
    const val = { id: 'u', text: 'Fallback', value: null, url: 'https://example.com' } as any
    expect(ResponseParser.parseUrl(val)).toEqual({ url: 'https://example.com', text: 'Fallback' })
  })

  it('returns empty strings when all fields are missing', () => {
    expect(ResponseParser.parseUrl({ id: 'u', text: '', value: null } as any)).toEqual({ url: '', text: '' })
  })
})

describe('ResponseParser.parseConnect', () => {
  it('returns linked_item_ids as strings in simple mode', () => {
    const val = { id: 'c', text: '', value: null, linked_item_ids: [1, 2, 3] } as any
    expect(ResponseParser.parseConnect(val)).toEqual(['1', '2', '3'])
  })

  it('returns empty array when linked_item_ids is missing', () => {
    expect(ResponseParser.parseConnect({ id: 'c', text: '', value: null } as any)).toEqual([])
  })

  it('parses linked_items with a nested schema in expanded mode', () => {
    const linkedSchema: BoardSchema = { title: { id: 'text__1', type: 'text' } }
    const val = {
      id: 'c', text: '', value: null,
      linked_items: [{ id: '10', name: 'Item A', column_values: [{ id: 'text__1', text: 'Hello', value: null }] }]
    } as any
    const result = ResponseParser.parseConnect(val, linkedSchema, { title: true }) as any[]
    expect(result).toEqual([{ id: '10', name: 'Item A', title: 'Hello' }])
  })
})

describe('ResponseParser.parseAsset', () => {
  it('parses a files array with public_url', () => {
    const val = { id: 'a', text: '', value: null, files: [{ name: 'doc.pdf', asset: { public_url: 'https://cdn.example.com/doc.pdf' } }] } as any
    expect(ResponseParser.parseAsset(val)).toEqual([{ name: 'doc.pdf', url: 'https://cdn.example.com/doc.pdf' }])
  })

  it('returns empty array when files is missing', () => {
    expect(ResponseParser.parseAsset({ id: 'a', text: '', value: null } as any)).toEqual([])
  })

  it('returns empty url when asset is missing from a file entry', () => {
    const val = { id: 'a', text: '', value: null, files: [{ name: 'x.png' }] } as any
    expect(ResponseParser.parseAsset(val)).toEqual([{ name: 'x.png', url: '' }])
  })
})

describe('ResponseParser.parseTag', () => {
  it('splits comma-separated text into trimmed tags', () => {
    const val = { id: 't', text: 'alpha, beta, gamma', value: null } as any
    expect(ResponseParser.parseTag(val)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('falls back to tag_ids when text is empty', () => {
    const val = { id: 't', text: '', value: null, tag_ids: [1, 2] } as any
    expect(ResponseParser.parseTag(val)).toEqual([1, 2])
  })
})

describe('ResponseParser.parseMirrorValue', () => {
  it('returns display_value', () => {
    const val = { id: 'm', text: '', value: null, display_value: 'Mirrored' } as any
    expect(ResponseParser.parseMirrorValue(val)).toBe('Mirrored')
  })

  it('falls back to text when display_value is missing', () => {
    expect(ResponseParser.parseMirrorValue({ id: 'm', text: 'fallback', value: null } as any)).toBe('fallback')
  })

  it('coerces to number when isNumber is true', () => {
    const val = { id: 'm', text: '', value: null, display_value: '99.5' } as any
    expect(ResponseParser.parseMirrorValue(val, true)).toBe(99.5)
  })
})

// ──────────────────────────────────────────────────────────────
// parse / parseMany — full item parsing
// ──────────────────────────────────────────────────────────────

const schema: BoardSchema = {
  email:  { id: 'email__1',  type: 'email' },
  status: { id: 'status__1', type: 'status' },
  score:  { id: 'num__1',    type: 'number' },
}

function makeItem(columnValues: any[], id = '1', name = 'Test Item') {
  return { id, name, column_values: columnValues }
}

describe('ResponseParser.parse', () => {
  const parser = new ResponseParser(schema)

  it('always returns id and name', () => {
    const result = parser.parse(makeItem([]), {})
    expect(result).toEqual({ id: '1', name: 'Test Item' })
  })

  it('parses a text column', () => {
    const item = makeItem([{ id: 'email__1', text: 'user@example.com', value: null }])
    expect(parser.parse(item, { email: true })).toEqual({ id: '1', name: 'Test Item', email: 'user@example.com' })
  })

  it('parses a number column', () => {
    const item = makeItem([{ id: 'num__1', text: '42', value: null }])
    expect(parser.parse(item, { score: true })).toEqual({ id: '1', name: 'Test Item', score: 42 })
  })

  it('parses a status column', () => {
    const item = makeItem([{ id: 'status__1', text: '', value: null, label: 'Done' }])
    expect(parser.parse(item, { status: true })).toEqual({ id: '1', name: 'Test Item', status: { label: 'Done' } })
  })

  it('omits columns not included in selection', () => {
    const item = makeItem([{ id: 'num__1', text: '42', value: null }])
    const result = parser.parse(item, { email: true }) as any
    expect(result.score).toBeUndefined()
  })

  it('omits columns explicitly set to false in selection', () => {
    const item = makeItem([{ id: 'email__1', text: 'x@y.com', value: null }])
    const result = parser.parse(item, { email: false }) as any
    expect(result.email).toBeUndefined()
  })

  it('handles a missing column_values array gracefully', () => {
    const result = parser.parse({ id: '1', name: 'No Cols' } as any, { email: true }) as any
    expect(result.id).toBe('1')
    expect(result.email).toBeUndefined()
  })

  it('returns undefined for a selected column absent from the response', () => {
    const result = parser.parse(makeItem([]), { email: true }) as any
    expect(result.email).toBeUndefined()
  })
})

describe('ResponseParser.parseMany', () => {
  const parser = new ResponseParser(schema)

  it('returns parsed objects for each item', () => {
    const items = [
      makeItem([{ id: 'email__1', text: 'a@b.com', value: null }], '1', 'First'),
      makeItem([{ id: 'email__1', text: 'c@d.com', value: null }], '2', 'Second'),
    ]
    const results = parser.parseMany(items, { email: true }) as any[]
    expect(results).toEqual([
      { id: '1', name: 'First', email: 'a@b.com' },
      { id: '2', name: 'Second', email: 'c@d.com' }
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parser.parseMany([], { email: true })).toEqual([])
  })
})

// ──────────────────────────────────────────────────────────────
// parseWebhookColumnValues
// ──────────────────────────────────────────────────────────────

describe('ResponseParser.parseWebhookColumnValues', () => {
  it('maps Monday column IDs to schema property names', () => {
    const result = ResponseParser.parseWebhookColumnValues(
      { email__1: { email: 'user@example.com', text: '' } },
      schema
    )
    expect(result.email).toBe('user@example.com')
  })

  it('stores columns not in the schema under their Monday ID', () => {
    const result = ResponseParser.parseWebhookColumnValues({ unknown__1: 'raw' }, schema)
    expect(result['unknown__1']).toBe('raw')
  })

  it('returns an empty object for null input', () => {
    expect(ResponseParser.parseWebhookColumnValues(null, schema)).toEqual({})
  })

  it('parses a status column via schema type', () => {
    const result = ResponseParser.parseWebhookColumnValues({ status__1: { label: 'Done' } }, schema)
    expect(result.status).toEqual({ label: 'Done' })
  })

  it('parses a number column via schema type', () => {
    const result = ResponseParser.parseWebhookColumnValues({ num__1: { value: '55' } }, schema)
    expect(result.score).toBe(55)
  })
})
