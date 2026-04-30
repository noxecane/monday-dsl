# Column Builder

## Entry point

```typescript
admin.columns(boardId: string): ColumnBuilder
```

## Type

```typescript
interface Column {
  id: string
  title: string
  type: string
  settings: Record<string, any> | null   // parsed from settings_str
}
```

`settings` replaces the current split between `getColumns` (no settings) and
`getColumnSettings` (settings only). If `settings: true` is selected, the builder
fetches and parses `settings_str` automatically.

## Read

```typescript
const cols = await admin.columns('123456').returning({
  id: true,
  title: true,
  type: true,
})
// → Array<Pick<Column, 'id' | 'title' | 'type'>>

// With settings
const cols = await admin.columns('123456').returning({
  id: true,
  settings: true,
})
// → Array<Pick<Column, 'id' | 'settings'>>
```

## Write

```typescript
await admin.columns('123456').create('col_id', 'Status', {
  type: 'status',
  labels: ['Pending', 'Approved', 'Rejected'],
  preface: 'name'   // optional: insert after this column id
})
// → Column
```

## Notes

- `settings` in the GQL query fetches `settings_str` and JSON-parses it client-side
- Selecting `settings: true` automatically uses `settings_str` in the query, not a
  field called `settings` (which doesn't exist in Monday's schema)
- The Column type unifies the old `Column` + `getColumnSettings` return values