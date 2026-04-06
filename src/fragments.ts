/**
 * Monday.com Query Library - GraphQL Fragments
 *
 * GraphQL fragment helpers for different column types
 * Self-contained - no external dependencies
 */

export function dateColumn(colType: 'date' | 'time' | 'iso') {
  switch (colType) {
    case 'date':
      return `... on DateValue { date }`
    case 'time':
      return `... on DateValue { time }`
    default:
      return ''
  }
}

export function urlColumn() {
  return `... on LinkValue {
    url
    url_text
  }`
}

export function connectColumn(cols?: string[], query?: string) {
  if (!cols || cols.length === 0) {
    return `... on BoardRelationValue { linked_item_ids }`
  }

  // Base fields needed for parser + optional type-specific fragments
  const baseFields = 'id\ntext\nvalue'
  const fullQuery = query ? `${baseFields}\n${query}` : baseFields

  return `... on BoardRelationValue {
    linked_items {
      id
      name
      column_values(ids: [${cols.map(t => `"${t}"`).join(',')}]) {
        ${fullQuery}
      }
    }
  }`
}

export function peopleColumn() {
  return `... on PeopleValue {
    text
    persons_and_teams {
      id
      kind
    }
  }`
}

export function dropDownColumn() {
  return `... on DropdownValue {
    values { label }
  }`
}

export function statusColumn() {
  return `... on StatusValue {
    label
    updated_at
  }`
}

export function mirrorColumn(fragment?: string) {
  if (!fragment) {
    return `... on MirrorValue { display_value }`
  }

  return `... on MirrorValue {
    display_value
    mirrored_items {
      mirrored_value {
        ${fragment}
      }
    }
  }`
}

export function assetColumn() {
  return `... on FileValue {
    files {
      ... on FileAssetValue {
        name
        asset {
          public_url
        }
      }
    }
  }`
}

export function tagColumn() {
  return `
    ... on TagsValue {
      tag_ids
      text
    }
  `
}

export function columns(...cols: number[]): string
export function columns(...cols: string[]): string
export function columns(...cols: number[] | string[]): string {
  if (typeof cols[0] === 'number') {
    return `[${cols.join(',')}]`
  } else {
    return `[${cols.map(x => `"${x}"`).join(',')}]`
  }
}
