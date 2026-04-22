# monday-dsl

A type-safe Monday.com GraphQL client and query DSL. No dependency on the official Monday SDK — just a clean, chainable API for querying boards, mutating items, and handling webhooks.

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Defining a Schema](#defining-a-schema)
- [Extending MondayBoard](#extending-mondayboard)
- [Querying Items](#querying-items)
- [Mutating Items](#mutating-items)
- [Webhook Tracking](#webhook-tracking)
- [Board Administration](#board-administration)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)

---

## Installation

```bash
npm install @noxecane/monday-dsl
# or
yarn add @noxecane/monday-dsl
```

---

## Setup

Create a client with your Monday.com API URL and token, then instantiate a board:

```typescript
import { MondayFetchClient, MondayBoard } from '@noxecane/monday-dsl'

const client = new MondayFetchClient(
  'https://api.monday.com/v2',
  process.env.MONDAY_TOKEN!
)

const board = new MondayBoard('YOUR_BOARD_ID', client, schema)
```

---

## Defining a Schema

A schema maps your column names to their Monday.com column IDs and types. Define it `as const` so TypeScript can infer return types precisely.

```typescript
const VacationSchema = {
  email:      { id: 'email__1',   type: 'email' },
  status:     { id: 'status__1',  type: 'status' },
  start_date: { id: 'date4__1',   type: 'date' },
  days:       { id: 'numbers__1', type: 'number' },
  manager:    { id: 'people__1',  type: 'people' },
} as const

const board = new MondayBoard('123456', client, VacationSchema)
```

### Supported Column Types

| Type       | TypeScript type returned          |
|------------|-----------------------------------|
| `text`     | `string`                          |
| `email`    | `string`                          |
| `phone`    | `string`                          |
| `number`   | `number`                          |
| `date`     | `string` (YYYY-MM-DD)             |
| `time`     | `string`                          |
| `iso`      | `Date \| null`                    |
| `status`   | `{ label: string; index?: number }`|
| `dropdown` | `string[]`                        |
| `people`   | `Array<{ id: string; kind: string }>` |
| `url`      | `{ url: string; text: string }`   |
| `connect`  | `string[]` (item IDs)             |
| `asset`    | `Array<{ name: string; url: string }>` |
| `tag`      | `string[]`                        |
| `mirror`   | `string`                          |

### Connect columns with nested schemas

When a connect column links to another board you can expand the linked items by providing a `linked_schema`. The parsed result will be typed objects instead of raw item IDs.

```typescript
const TaskSchema = {
  title:    { id: 'text__1',    type: 'text' },
  priority: { id: 'status__1', type: 'status' },
} as const

const ProjectSchema = {
  name:  { id: 'name',        type: 'text' },
  tasks: {
    id:            'connect__1',
    type:          'connect',
    linked_schema: TaskSchema,   // expand linked items using this schema
  },
} as const
```

When `linked_schema` is present, `board.query().returning({ tasks: true })` returns
`Array<{ id: string; name: string; [TaskSchema keys] }>` objects instead of `string[]`.

---

## Extending MondayBoard

The primary usage pattern is to subclass `MondayBoard` and add domain-specific query and mutation methods. This keeps board logic in one place and gives callers a clean, intention-revealing API.

```typescript
import { MondayBoard } from '@noxecane/monday-dsl'
import { VacationSchema } from './schema'

export class VacationRequestBoard extends MondayBoard<typeof VacationSchema> {
  constructor(client: MondayClient) {
    super('123456', client, VacationSchema)
  }

  /** Return all requests in a given status. */
  async getByStatus(status: string) {
    return this.findMany(
      q => q.equals('status', status),
      { email: true, status: true, start_date: true, days: true }
    )
  }

  /** Approve a request by item ID. */
  async approve(itemId: string) {
    return this.mutation()
      .update(itemId, { status: 'Approved' })
      .exec()
  }
}
```

This pattern also makes board classes straightforward to mock or stub in tests.

---

## Querying Items

All queries start with `board.query()` and end with a terminal method that executes the request.

### Basic query

```typescript
const items = await board.query()
  .returning({ email: true, status: true })

// items is typed: Array<{ id: string; name: string; email: string; status: { label: string } }>
```

### Filtering

Chain filter methods before the terminal call. Multiple filters are combined with AND by default.

```typescript
// Exact match (any_of with single value)
.equals('status', 'Approved')

// Match any of several values
.anyOf('status', ['Approved', 'Pending'])

// Exclude values
.notAnyOf('status', ['Rejected'])

// Text search
.contains('email', '@company.com')

// Numeric / date comparisons
.greaterThan('days', 5)
.lessThan('start_date', new Date('2025-12-31'))
.greaterThanOrEquals('days', 3)
.lessThanOrEquals('days', 10)
.between('days', 3, 10)

// Empty / not empty
.isEmpty('manager')
.isNotEmpty('manager')
```

### Ordering and limiting

```typescript
const items = await board.query()
  .contains('status', 'Approved')
  .orderBy('start_date', 'asc')
  .limit(20)
  .returning({ email: true, start_date: true })
```

### Terminal methods

```typescript
// All matching items (first page)
const items = await board.query().returning({ email: true })

// First matching item, or null
const item = await board.query()
  .equals('email', 'user@example.com')
  .first({ email: true, status: true })

// Fetch by known item ID
const item = await board.getById('987654321', { email: true, status: true })

// All items across multiple pages (fetches up to maxPages, default 10)
const all = await board.query().all({ email: true }, /* maxPages */ 20)

// Single page with cursor for manual pagination
const page = await board.query().limit(50).page({ email: true })
// page.items, page.cursor, page.hasMore

// Lazy async iterator for paginated processing
for await (const page of board.query().paginate({ email: true })) {
  console.log(page.items)
  if (!page.hasMore) break
}
```

### Convenience methods

```typescript
// findOne — applies filters via a callback, returns first match or null
const item = await board.findOne(
  q => q.contains('status', 'Approved').greaterThan('days', 5),
  { email: true, status: true }
)

// findMany — applies filters, returns all matches
const items = await board.findMany(
  q => q.equals('status', 'Pending'),
  { email: true, days: true }
)
```

---

## Mutating Items

All mutations are batched — chain multiple operations and execute them in a single API call with `.exec()`.

### Creating items

```typescript
const item = await board.mutation()
  .create({ name: 'Alice Smith', email: 'alice@example.com', status: 'Pending', days: 5 })
  .exec({ id: true, name: true, email: true })
```

### Updating items

```typescript
await board.mutation()
  .update('987654321', { status: 'Approved', days: 7 })
  .exec()
```

Passing `name` alongside column values splits into a column update + rename automatically:

```typescript
await board.mutation()
  .update('987654321', { name: 'Alice Johnson', status: 'Approved' })
  .exec()
```

### Renaming items

```typescript
await board.mutation()
  .rename('987654321', 'New Item Name')
  .exec()
```

### Deleting items

```typescript
await board.mutation()
  .delete('987654321')
  .exec()
```

### Batching multiple operations

```typescript
const result = await board.mutation()
  .create({ name: 'Item A', status: 'Pending' })
  .create({ name: 'Item B', status: 'Pending' })
  .update('111', { status: 'Approved' })
  .delete('222')
  .exec({ id: true, name: true })
// Returns the result of the last operation
```

### Raw column updates

For columns not in your schema (e.g. dynamic timeline slots), use `updateRaw` with Monday.com column IDs directly:

```typescript
await board.mutation()
  .updateRaw('987654321', {
    'timeline_2026_0': { from: '2026-01-01', to: '2026-01-05' }
  })
  .exec()
```

---

## Webhook Tracking

`BoardTracker` is an abstract base class for receiving and routing Monday.com webhook events. Extend it and decorate handler methods.

### Defining a tracker

```typescript
import { BoardTracker, onCreate, onColumnChange, onStatusChange } from '@noxecane/monday-dsl'
import { VacationSchema } from './schema'

export class VacationTracker extends BoardTracker<typeof VacationSchema> {
  // Fires when a new item is created
  @onCreate()
  async handleNewRequest(item: Record<string, any>, event: CreateItemPayload) {
    console.log('New request from', item.email)
  }

  // Fires when the email column changes
  @onColumnChange('email')
  async handleEmailChange(newValue: any, oldValue: any, event: UpdateColumnValuePayload) {
    console.log('Email changed from', oldValue, 'to', newValue)
  }

  // Fires when status changes to 'Approved'
  @onStatusChange('status', { to: 'Approved' })
  async handleApproval(newLabel: string, oldLabel: string, event: UpdateColumnValuePayload) {
    console.log('Request approved, was:', oldLabel)
  }

  // Fires on any transition between specific statuses
  @onStatusChange('status', { from: 'Pending', to: ['Approved', 'Rejected'] })
  async handleDecision(newLabel: string, oldLabel: string, event: UpdateColumnValuePayload) {
    // ...
  }
}
```

### Wiring up the webhook endpoint

```typescript
const tracker = new VacationTracker(client, VacationSchema)

// Express example
app.post('/webhooks/vacation', async (req, res) => {
  const response = await tracker.handleWebhook(req.body)
  // Monday.com sends a challenge on first subscription — return it
  res.json(response ?? { ok: true })
})
```

### Decorator options

| Decorator | Arguments | Description |
|---|---|---|
| `@onCreate()` | — | Fires on `create_pulse` events |
| `@onColumnChange(column, options?)` | `column`: schema key<br>`options.ignoreEmpty`: skip if new value is empty | Fires on any column value change |
| `@onStatusChange(column, options?)` | `column`: schema key<br>`options.to`: label(s) to match<br>`options.from`: label(s) to match | Fires on status transitions |

---

## Board Administration

`BoardAdmin` handles infrastructure-level operations on boards.

```typescript
import { BoardAdmin } from '@noxecane/monday-dsl'

const admin = new BoardAdmin(client)
```

### Webhooks

```typescript
// Create
await admin.createWebhook('123456', 'https://your-app.com/webhook', {
  event: 'change_specific_column_value',
  config: { columnId: 'status__1' }
})

// List
const webhooks = await admin.getWebhooks('123456')

// Delete one
await admin.deleteWebhook('webhook-id')

// Delete many
await admin.deleteWebhooks(['id-1', 'id-2', 'id-3'])
```

### Columns

```typescript
// List columns
const columns = await admin.getColumns('123456')

// Get column settings (labels, colors, etc.)
const settings = await admin.getColumnSettings('123456')

// Create a column
await admin.createColumn('123456', 'approval__1', 'Approval Status', {
  type: 'status',
  labels: ['Pending', 'Approved', 'Rejected']
})
```

### Users, groups, and boards

```typescript
// All non-guest users (paginated)
const users = await admin.getAllUsers(100, 1)

// Groups in a board
const groups = await admin.getGroups('123456')

// Boards in a folder
const boards = await admin.getBoardsByFolder('folder-id')
const allBoards = await admin.getBoardsByFolder('folder-id', /* recursive */ true)
```

---

## Error Handling

All errors extend `MondayError` and carry a `code` string for programmatic handling.

```typescript
import {
  MondayError,
  AuthenticationError,
  RateLimitError,
  MondayApiError,
  NetworkError,
  QuerySyntaxError,
  ValidationError,
  ParseError
} from '@noxecane/monday-dsl'

try {
  await board.query().returning({ email: true })
} catch (err) {
  if (err instanceof AuthenticationError) {
    // Invalid or expired token
  } else if (err instanceof RateLimitError) {
    console.log('Retry after', err.retryAfter, 'seconds')
  } else if (err instanceof MondayApiError) {
    console.log('API error code:', err.errorCode)
  } else if (err instanceof NetworkError) {
    console.log('HTTP status:', err.statusCode)
  } else if (err instanceof MondayError) {
    console.log('Library error:', err.code, err.details)
  }
}
```

| Class | `code` | When thrown |
|---|---|---|
| `AuthenticationError` | `AUTHENTICATION_ERROR` | 401/403 HTTP responses |
| `RateLimitError` | `RATE_LIMIT_ERROR` | 429 HTTP responses |
| `MondayApiError` | `MONDAY_API_ERROR` | Monday.com API-level errors |
| `NetworkError` | `NETWORK_ERROR` | Connection failures, 5xx responses |
| `QuerySyntaxError` | `QUERY_SYNTAX_ERROR` | GraphQL syntax errors |
| `ValidationError` | `VALIDATION_ERROR` | Invalid mutation inputs |
| `ParseError` | `PARSE_ERROR` | Malformed API responses |

---

## API Reference

### `MondayFetchClient`

```typescript
new MondayFetchClient(url: string, token: string)
```

| Method | Signature | Description |
|---|---|---|
| `run` | `run<T>(query: string, mode?: 'debug' \| 'dry'): Promise<T>` | Execute a GraphQL query. `debug` logs the query; `dry` logs and skips execution. |
| `upload` | `upload<T>(item: string, columnId: string, upload: MondayUpload): Promise<T>` | Upload a file to an item column. |

---

### `MondayBoard<TSchema>`

```typescript
new MondayBoard(boardId: string, client: MondayClient, schema: TSchema)
```

| Method | Returns | Description |
|---|---|---|
| `query()` | `BoardQuery<TSchema>` | Start a chainable query builder |
| `mutation()` | `BoardMutation<TSchema>` | Start a chainable mutation builder |
| `getById(itemId, selection)` | `Promise<Item \| null>` | Fetch a single item by ID |
| `findOne(finder, selection)` | `Promise<Item \| null>` | Apply filters, return first match |
| `findMany(finder, selection)` | `Promise<Item[]>` | Apply filters, return all matches |

---

### `BoardQuery<TSchema>`

All filter methods return `this` for chaining. Terminal methods execute the request.

**Filters**

| Method | Description |
|---|---|
| `.anyOf(column, values)` | Column value is in the array |
| `.notAnyOf(column, values)` | Column value is not in the array |
| `.contains(column, value)` | Column contains the search term |
| `.equals(column, value)` | Exact match |
| `.greaterThan(column, value)` | `>` — numbers or dates |
| `.greaterThanOrEquals(column, value)` | `>=` — numbers or dates |
| `.lessThan(column, value)` | `<` — numbers or dates |
| `.lessThanOrEquals(column, value)` | `<=` — numbers or dates |
| `.between(column, start, end)` | Inclusive range |
| `.isEmpty(column)` | Column has no value |
| `.isNotEmpty(column)` | Column has a value |

**Options**

| Method | Description |
|---|---|
| `.limit(n)` | Return at most `n` items |
| `.cursor(cursor)` | Start from a pagination cursor |
| `.orderBy(column, direction?)` | Order results (`'asc'` or `'desc'`, default `'desc'`) |

**Terminal methods**

| Method | Returns | Description |
|---|---|---|
| `.returning(selection)` | `Promise<Item[]>` | Fetch one page of results |
| `.first(selection)` | `Promise<Item \| null>` | Fetch first match |
| `.all(selection, maxPages?)` | `Promise<Item[]>` | Fetch all pages (default max: 10) |
| `.page(selection)` | `Promise<PageResult<Item>>` | Fetch one page with cursor metadata |
| `.paginate(selection, maxPages?)` | `AsyncGenerator<PageResult<Item>>` | Lazy page-by-page iteration |
| `.getById(itemId, selection)` | `Promise<Item \| null>` | Fetch by item ID |

---

### `BoardMutation<TSchema>`

All mutation methods return `this` for chaining.

| Method | Description |
|---|---|
| `.create(input)` | Queue a create operation |
| `.update(itemId, input)` | Queue an update (and optional rename) |
| `.updateRaw(itemId, columnValues)` | Queue an update with raw Monday.com column IDs |
| `.rename(itemId, name)` | Queue a rename |
| `.delete(itemId)` | Queue a delete |
| `.exec(selection?)` | Execute all queued operations, return last result |

---

### `BoardTracker<TSchema>`

```typescript
abstract class BoardTracker<TSchema extends BoardSchema>
constructor(client: MondayClient, schema: TSchema)
```

| Method | Description |
|---|---|
| `handleWebhook(payload)` | Route an incoming webhook payload to decorated handlers |

**Protected properties** (available in subclasses)

| Property | Type | Description |
|---|---|---|
| `this.client` | `MondayClient` | The underlying HTTP client |
| `this.admin` | `BoardAdmin` | Administrative operations on the board |
| `this.schema` | `TSchema` | The board schema passed to the constructor |

> Trackers are responsible for event routing, not data access. Prefer delegating queries and mutations to a `MondayBoard` subclass rather than calling `this.client` or `this.admin` directly inside handlers.

**Decorators**

| Decorator | Handler signature | Description |
|---|---|---|
| `@onCreate()` | `(item: Record<string, any>, event: CreateItemPayload) => Promise<void>` | Item creation |
| `@onColumnChange(column, options?)` | `(newValue: any, oldValue: any, event: UpdateColumnValuePayload) => Promise<void>` | Column value changed |
| `@onStatusChange(column, options?)` | `(newLabel: string, oldLabel: string, event: UpdateColumnValuePayload) => Promise<void>` | Status transitioned |

---

### `BoardAdmin`

```typescript
new BoardAdmin(client: MondayClient)
```

| Method | Returns | Description |
|---|---|---|
| `getBoardName(boardId)` | `Promise<string>` | Board name |
| `getGroups(boardId)` | `Promise<Group[]>` | All groups in board |
| `getAllUsers(limit?, page?)` | `Promise<User[]>` | Non-guest users |
| `getColumns(boardId)` | `Promise<Column[]>` | All columns |
| `getColumnSettings(boardId)` | `Promise<Record<string, any>>` | Column label/settings data |
| `createColumn(boardId, id, title, config)` | `Promise<Column>` | Create a column |
| `createWebhook(boardId, url, eventConfig)` | `Promise<{ id, board_id }>` | Register a webhook |
| `deleteWebhook(webhookId)` | `Promise<string>` | Delete one webhook |
| `deleteWebhooks(webhookIds)` | `Promise<string[]>` | Delete multiple webhooks |
| `getWebhooks(boardId)` | `Promise<Webhook[]>` | List webhooks for a board |
| `getBoardsByFolder(folderId, recursive?)` | `Promise<Array<{ id, name }>>` | Boards in a folder |
| `withTemporaryItem(boardId, operation)` | `Promise<T>` | Create a temp item, run operation, auto-delete |
