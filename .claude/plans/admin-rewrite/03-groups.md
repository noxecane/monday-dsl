# Group Builder

## Entry point

```typescript
admin.groups(boardId: string): GroupBuilder
```

## Type

```typescript
interface Group {
  id: string
  title: string
  position: string
  archived: boolean
}
```

## Read

```typescript
const groups = await admin.groups('123456').returning({
  id: true,
  title: true,
  position: true,
  archived: true,
})
// → Array<Pick<Group, 'id' | 'title' | 'position' | 'archived'>>
```

## Notes

- Read-only — Monday.com's API does not expose group create/delete/reorder
  via standard GraphQL at the board level
- `Group` here is the same type already in `client.ts` — consolidate on import
