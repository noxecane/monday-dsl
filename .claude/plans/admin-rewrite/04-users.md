# User Builder

## Entry point

```typescript
admin.users(options?: { limit?: number; page?: number }): UserBuilder
```

Pagination options are passed at construction time since they are query-level
parameters, not filters. Default: `limit: 100, page: 1`.

## Type

```typescript
interface User {
  id: string
  name: string
  email: string
  enabled: boolean
}
```

## Read

```typescript
const users = await admin.users().returning({
  id: true,
  email: true,
  enabled: true,
})
// → Array<Pick<User, 'id' | 'email' | 'enabled'>>

// With pagination
const page2 = await admin.users({ limit: 50, page: 2 }).returning({
  id: true,
  name: true,
})
```

## Notes

- Read-only — user management is out of scope for a board DSL
- Only non-guest users are returned (matches current `getAllUsers` behaviour)
- Pagination is explicit at construction — no cursor, Monday's users query
  uses page-based pagination