# Admin Rewrite — Overview

## Goal

Replace the current mix of ad-hoc helper methods on `BoardAdmin` with a consistent
query builder / mutation builder pattern across every resource.

## Current state

| Resource | Now |
|---|---|
| Board | `admin.board(boardId).returning(sel)` ✓ |
| Folder | `admin.folder(folderId).returning(sel)` ✓ |
| Webhook | `admin.webhooks(boardId).returning(sel)` + separate `createWebhook`, `deleteWebhook`, `deleteWebhooks` helpers |
| Column | `getColumns`, `getColumnSettings`, `createColumn` helpers |
| Group | `getGroups` helper |
| User | `getAllUsers` helper |

## Target state

Every resource is accessed via a method on `BoardAdmin` that returns a builder.
The builder exposes `.returning(selection)` for reads and named methods for writes.
All reads use `Record<K, true>` + `Pick<T, K>` for inferred return types.

```
admin.board(boardId)           → BoardQueryBuilder        (read-only)
admin.folder(folderId)         → FolderQueryBuilder       (read-only)
admin.webhooks(boardId)        → WebhookBuilder           (read + write)
admin.columns(boardId)         → ColumnBuilder            (read + write)
admin.groups(boardId)          → GroupBuilder             (read-only)
admin.users(options?)          → UserBuilder              (read-only)
```

## What stays

- `withTemporaryItem` — internal utility, no builder needed
- `BoardQueryBuilder`, `FolderQueryBuilder` — already correct, no changes

## File structure (proposed)

```
src/meta/
  board.ts       ← unchanged
  folder.ts      ← unchanged
  webhook.ts     ← replaced by builders/webhook.ts
  index.ts       ← updated barrel

src/admin/
  index.ts       ← BoardAdmin class (entry points only)
  builders/
    webhook.ts
    column.ts
    group.ts
    user.ts
```

Or keep everything flat in `src/meta/` — TBD after review.
