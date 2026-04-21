import {
  dateColumn,
  urlColumn,
  connectColumn,
  peopleColumn,
  dropDownColumn,
  statusColumn,
  mirrorColumn,
  assetColumn,
  tagColumn,
  columns
} from '../src/fragments'

/** Collapse all whitespace to single spaces for readable exact-match comparisons */
const n = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('dateColumn', () => {
  it('"date" → DateValue date fragment', () => {
    expect(dateColumn('date')).toBe('... on DateValue { date }')
  })

  it('"time" → DateValue time fragment', () => {
    expect(dateColumn('time')).toBe('... on DateValue { time }')
  })

  it('"iso" → empty string', () => {
    expect(dateColumn('iso')).toBe('')
  })
})

describe('urlColumn', () => {
  it('returns exact LinkValue fragment', () => {
    expect(n(urlColumn())).toBe('... on LinkValue { url url_text }')
  })
})

describe('peopleColumn', () => {
  it('returns exact PeopleValue fragment', () => {
    expect(n(peopleColumn())).toBe('... on PeopleValue { text persons_and_teams { id kind } }')
  })
})

describe('statusColumn', () => {
  it('returns exact StatusValue fragment', () => {
    expect(n(statusColumn())).toBe('... on StatusValue { label updated_at }')
  })
})

describe('dropDownColumn', () => {
  it('returns exact DropdownValue fragment', () => {
    expect(n(dropDownColumn())).toBe('... on DropdownValue { values { label } }')
  })
})

describe('mirrorColumn', () => {
  it('returns display_value only fragment by default', () => {
    expect(n(mirrorColumn())).toBe('... on MirrorValue { display_value }')
  })

  it('includes mirrored_items with nested fragment when provided', () => {
    expect(n(mirrorColumn('... on StatusValue { label }'))).toBe(
      '... on MirrorValue { display_value mirrored_items { mirrored_value { ... on StatusValue { label } } } }'
    )
  })
})

describe('assetColumn', () => {
  it('returns exact FileValue fragment', () => {
    expect(n(assetColumn())).toBe('... on FileValue { files { ... on FileAssetValue { name asset { public_url } } } }')
  })
})

describe('tagColumn', () => {
  it('returns exact TagsValue fragment', () => {
    expect(n(tagColumn())).toBe('... on TagsValue { tag_ids text }')
  })
})

describe('connectColumn', () => {
  it('no args → simple linked_item_ids fragment', () => {
    expect(connectColumn()).toBe('... on BoardRelationValue { linked_item_ids }')
  })

  it('empty array → simple linked_item_ids fragment', () => {
    expect(connectColumn([])).toBe('... on BoardRelationValue { linked_item_ids }')
  })

  it('with column ids → expanded linked_items fragment', () => {
    expect(n(connectColumn(['col__1', 'col__2']))).toBe(
      '... on BoardRelationValue { linked_items { id name column_values(ids: ["col__1","col__2"]) { id text value } } }'
    )
  })

  it('with column ids and nested query → includes nested fragment', () => {
    expect(n(connectColumn(['col__1'], '... on StatusValue { label }'))).toBe(
      '... on BoardRelationValue { linked_items { id name column_values(ids: ["col__1"]) { id text value ... on StatusValue { label } } } }'
    )
  })
})

describe('columns', () => {
  it('formats string column ids as a quoted JSON array', () => {
    expect(columns('email__1', 'text__2')).toBe('["email__1","text__2"]')
  })

  it('formats number column ids as a bare array', () => {
    expect(columns(1, 2, 3)).toBe('[1,2,3]')
  })

  it('handles a single string column id', () => {
    expect(columns('id__1')).toBe('["id__1"]')
  })
})
