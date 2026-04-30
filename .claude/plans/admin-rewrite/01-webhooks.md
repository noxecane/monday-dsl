# Webhook Builder

## Entry point

```typescript
admin.webhooks(boardId: string): WebhookBuilder
```

## Type

```typescript
interface Webhook {
  id: string
  event: WebhookEvent
  config: WebhookConfig   // { column?, labelIndex?, groupId? }
}
```

## Read

```typescript
const webhooks = await admin.webhooks('123456').returning({
  id: true,
  event: true,
  config: true,
})
// → Array<Pick<Webhook, 'id' | 'event' | 'config'>>
```

## Write

```typescript
// Register
await admin.webhooks('123456').create('https://app.com/hook', {
  event: 'change_specific_column_value',
  config: { columnId: 'status__1' }
})
// → { id: string; board_id: string }

// Delete one
await admin.webhooks('123456').delete('webhook-id')
// → string (deleted id)

// Delete many
await admin.webhooks('123456').deleteMany(['id-1', 'id-2'])
// → string[]
```

## Notes

- `config` on read is always parsed from Monday's raw format into the structured object
- `create` takes the same `EventConfig` union as now
- No builder chaining on writes — they are atomic