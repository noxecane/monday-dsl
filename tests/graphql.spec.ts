import { GraphQLBuilder } from '../src/graphql'
import { BoardSchema, MutationOperation, QueryState } from '../src/types'

/** Collapse all whitespace to single spaces for readable exact-match comparisons */
const n = (s: string) => s.replace(/\s+/g, ' ').trim()

const schema: BoardSchema = {
  email:  { id: 'email__1',  type: 'email' },
  status: { id: 'status__1', type: 'status' },
  note:   { id: 'text__1',   type: 'text' },
  score:  { id: 'num__1',    type: 'number' },
  date:   { id: 'date__1',   type: 'date' },
  people: { id: 'people__1', type: 'people' },
  link:   { id: 'url__1',    type: 'url' },
}

const BOARD_ID = '12345'

function state(overrides: Partial<QueryState> = {}): QueryState {
  return { filters: [], ...overrides }
}

// ──────────────────────────────────────────────────────────────
// buildQuery
// ──────────────────────────────────────────────────────────────

describe('GraphQLBuilder.buildQuery', () => {
  it('generates a bare query with no filters or params', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state(), { email: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page { cursor items { id name column_values(ids: ["email__1"]) { id text value } } } } }'
    )
  })

  it('includes type fragment when a structured column is selected', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state(), { status: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page { cursor items { id name column_values(ids: ["status__1"]) { id text value ... on StatusValue { label updated_at } } } } } }'
    )
  })

  it('includes multiple column ids and deduplicates fragments', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state(), { email: true, status: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page { cursor items { id name column_values(ids: ["email__1","status__1"]) { id text value ... on StatusValue { label updated_at } } } } } }'
    )
  })

  it('adds limit param', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state({ limit: 5 }), { email: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(limit: 5) { cursor items { id name column_values(ids: ["email__1"]) { id text value } } } } }'
    )
  })

  it('adds cursor param', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state({ cursor: 'abc123' }), { email: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(cursor: "abc123") { cursor items { id name column_values(ids: ["email__1"]) { id text value } } } } }'
    )
  })

  it('combines limit and cursor params', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema, state({ limit: 5, cursor: 'abc' }), { email: true }))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(limit: 5, cursor: "abc") { cursor items { id name column_values(ids: ["email__1"]) { id text value } } } } }'
    )
  })

  it('generates an any_of filter rule', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'email__1', operator: 'any_of', compare_value: ['a@b.com'] }] }),
      { email: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "email__1", compare_value: ["a@b.com"], operator: any_of}] }) { cursor items { id name column_values(ids: ["email__1"]) { id text value } } } } }'
    )
  })

  it('generates a contains_terms filter rule', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'text__1', operator: 'contains_terms', compare_value: 'hello' }] }),
      { note: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "text__1", compare_value: "hello", operator: contains_terms}] }) { cursor items { id name column_values(ids: ["text__1"]) { id text value } } } } }'
    )
  })

  it('generates a between filter rule with array compare_value', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'num__1', operator: 'between', compare_value: ['10', '20'] }] }),
      { score: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "num__1", compare_value: ["10", "20"], operator: between}] }) { cursor items { id name column_values(ids: ["num__1"]) { id text value } } } } }'
    )
  })

  it('generates a date filter with compare_attribute and date fragment', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'date__1', operator: 'greater_than', compare_value: '2024-01-01', compare_attribute: 'DATE' }] }),
      { date: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "date__1", compare_value: "2024-01-01", operator: greater_than, compare_attribute: "DATE"}] }) { cursor items { id name column_values(ids: ["date__1"]) { id text value ... on DateValue { date } } } } } }'
    )
  })

  it('generates an order_by param', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ orderBy: { column_id: 'num__1', direction: 'asc' } }),
      { score: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { order_by: { column_id: "num__1", direction: asc } }) { cursor items { id name column_values(ids: ["num__1"]) { id text value } } } } }'
    )
  })

  it('combines multiple filter rules with an or operator', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({
        operator: 'or',
        filters: [
          { column_id: 'email__1', operator: 'any_of', compare_value: ['a@b.com'] },
          { column_id: 'text__1', operator: 'contains_terms', compare_value: 'hello' }
        ]
      }),
      { email: true, note: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "email__1", compare_value: ["a@b.com"], operator: any_of}, {column_id: "text__1", compare_value: "hello", operator: contains_terms}], operator: or }) { cursor items { id name column_values(ids: ["email__1","text__1"]) { id text value } } } } }'
    )
  })

  it('escapes double quotes in compare values', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'text__1', operator: 'any_of', compare_value: ['say "hi"'] }] }),
      { note: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "text__1", compare_value: ["say \\"hi\\""], operator: any_of}] }) { cursor items { id name column_values(ids: ["text__1"]) { id text value } } } } }'
    )
  })

  it('escapes newlines in compare values', () => {
    const q = n(GraphQLBuilder.buildQuery(BOARD_ID, schema,
      state({ filters: [{ column_id: 'text__1', operator: 'any_of', compare_value: ['line1\nline2'] }] }),
      { note: true }
    ))
    expect(q).toBe(
      '{ boards(ids: 12345) { items_page(query_params: { rules: [{column_id: "text__1", compare_value: ["line1\\nline2"], operator: any_of}] }) { cursor items { id name column_values(ids: ["text__1"]) { id text value } } } } }'
    )
  })
})

// ──────────────────────────────────────────────────────────────
// getFragmentForType
// ──────────────────────────────────────────────────────────────

describe('GraphQLBuilder.getFragmentForType', () => {
  it('text → empty string (uses plain text field)', () => {
    expect(GraphQLBuilder.getFragmentForType('text')).toBe('')
  })

  it('number → empty string', () => {
    expect(GraphQLBuilder.getFragmentForType('number')).toBe('')
  })

  it('email → empty string', () => {
    expect(GraphQLBuilder.getFragmentForType('email')).toBe('')
  })

  it('phone → empty string', () => {
    expect(GraphQLBuilder.getFragmentForType('phone')).toBe('')
  })

  it('date → DateValue date fragment', () => {
    expect(GraphQLBuilder.getFragmentForType('date')).toBe('... on DateValue { date }')
  })

  it('time → DateValue time fragment', () => {
    expect(GraphQLBuilder.getFragmentForType('time')).toBe('... on DateValue { time }')
  })

  it('status → StatusValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('status'))).toBe('... on StatusValue { label updated_at }')
  })

  it('dropdown → DropdownValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('dropdown'))).toBe('... on DropdownValue { values { label } }')
  })

  it('people → PeopleValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('people'))).toBe('... on PeopleValue { text persons_and_teams { id kind } }')
  })

  it('url → LinkValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('url'))).toBe('... on LinkValue { url url_text }')
  })

  it('connect with no linked schema → simple linked_item_ids fragment', () => {
    expect(GraphQLBuilder.getFragmentForType('connect')).toBe('... on BoardRelationValue { linked_item_ids }')
  })

  it('connect with linked schema and selection → expanded linked_items fragment', () => {
    const linkedSchema: BoardSchema = { title: { id: 'text__1', type: 'text' } }
    const frag = n(GraphQLBuilder.getFragmentForType('connect', linkedSchema, { title: true }))
    expect(frag).toBe('... on BoardRelationValue { linked_items { id name column_values(ids: ["text__1"]) { id text value } } }')
  })

  it('asset → FileValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('asset'))).toBe('... on FileValue { files { ... on FileAssetValue { name asset { public_url } } } }')
  })

  it('tag → TagsValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('tag'))).toBe('... on TagsValue { tag_ids text }')
  })

  it('mirror → MirrorValue fragment', () => {
    expect(n(GraphQLBuilder.getFragmentForType('mirror'))).toBe('... on MirrorValue { display_value }')
  })
})

// ──────────────────────────────────────────────────────────────
// buildColumnFragments
// ──────────────────────────────────────────────────────────────

describe('GraphQLBuilder.buildColumnFragments', () => {
  it('returns empty string for text-only selection', () => {
    const frag = GraphQLBuilder.buildColumnFragments(schema, ['email', 'note'], { email: true, note: true })
    expect(frag.trim()).toBe('')
  })

  it('returns status fragment for a status column', () => {
    const frag = n(GraphQLBuilder.buildColumnFragments(schema, ['status'], { status: true }))
    expect(frag).toBe('... on StatusValue { label updated_at }')
  })

  it('deduplicates fragments when two columns share the same type', () => {
    const twoStatusSchema: BoardSchema = {
      s1: { id: 's1__1', type: 'status' },
      s2: { id: 's2__1', type: 'status' },
    }
    const frag = n(GraphQLBuilder.buildColumnFragments(twoStatusSchema, ['s1', 's2'], { s1: true, s2: true }))
    expect(frag).toBe('... on StatusValue { label updated_at }')
  })

  it('returns one fragment per distinct type for mixed selection', () => {
    const frag = n(GraphQLBuilder.buildColumnFragments(schema, ['status', 'people', 'link'], { status: true, people: true, link: true }))
    expect(frag).toBe(
      '... on StatusValue { label updated_at } ... on PeopleValue { text persons_and_teams { id kind } } ... on LinkValue { url url_text }'
    )
  })
})

// ──────────────────────────────────────────────────────────────
// buildMutation
// ──────────────────────────────────────────────────────────────

describe('GraphQLBuilder.buildMutation', () => {
  it('generates a create mutation', () => {
    const ops: MutationOperation[] = [{ op: 'create', alias: 'op0', name: 'New Item', columnValues: {} }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: create_item(board_id: 12345, item_name: "New Item", column_values: "{}") { id name } }'
    )
  })

  it('serializes column values as escaped JSON in create', () => {
    const ops: MutationOperation[] = [{ op: 'create', alias: 'op0', name: 'Item', columnValues: { email__1: 'x@y.com' } }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: create_item(board_id: 12345, item_name: "Item", column_values: "{\\"email__1\\":\\"x@y.com\\"}") { id name } }'
    )
  })

  it('generates an update mutation', () => {
    const ops: MutationOperation[] = [{ op: 'update', alias: 'op0', itemId: '999', columnValues: {} }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: change_multiple_column_values(board_id: 12345, item_id: 999, column_values: "{}") { id name } }'
    )
  })

  it('generates a rename mutation', () => {
    const ops: MutationOperation[] = [{ op: 'rename', alias: 'op0', itemId: '42', name: 'Renamed' }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: change_simple_column_value(board_id: 12345, item_id: 42, column_id: "name", value: "Renamed") { id name } }'
    )
  })

  it('generates a delete mutation', () => {
    const ops: MutationOperation[] = [{ op: 'delete', alias: 'op0', itemId: '77' }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe('mutation { op0: delete_item(item_id: 77) { id name } }')
  })

  it('batches multiple operations into one mutation block', () => {
    const ops: MutationOperation[] = [
      { op: 'create', alias: 'op0', name: 'A', columnValues: {} },
      { op: 'delete', alias: 'op1', itemId: '1' }
    ]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: create_item(board_id: 12345, item_name: "A", column_values: "{}") { id name } op1: delete_item(item_id: 1) { id name } }'
    )
  })

  it('escapes double quotes and newlines in item names', () => {
    const ops: MutationOperation[] = [{ op: 'create', alias: 'op0', name: 'Say "hello"\nnewline', columnValues: {} }]
    const q = n(GraphQLBuilder.buildMutation(BOARD_ID, schema, ops))
    expect(q).toBe(
      'mutation { op0: create_item(board_id: 12345, item_name: "Say \\"hello\\"\\nnewline", column_values: "{}") { id name } }'
    )
  })

  it('throws on unknown operation type', () => {
    const ops = [{ op: 'unknown', alias: 'op0' }] as any
    expect(() => GraphQLBuilder.buildMutation(BOARD_ID, schema, ops)).toThrow('Unknown mutation operation: unknown')
  })
})
