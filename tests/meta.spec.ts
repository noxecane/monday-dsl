import { BoardQueryBuilder, FolderQueryBuilder, WebhookQueryBuilder } from '../src/meta'

const n = (s: string) => s.replace(/\s+/g, ' ').trim()

function mockClient(result: any) {
  return { run: jest.fn().mockResolvedValue(result) }
}

// ──────────────────────────────────────────────────────────────
// BoardQueryBuilder
// ──────────────────────────────────────────────────────────────

describe('BoardQueryBuilder.returning', () => {
  it('fetches only selected scalar fields', async () => {
    const client = mockClient({ boards: [{ id: '123', name: 'My Board' }] })
    const builder = new BoardQueryBuilder('123', client as any)
    const result = await builder.returning({ id: true, name: true })
    expect(result).toEqual({ id: '123', name: 'My Board' })
  })

  it('sends a query containing only selected fields', async () => {
    const client = mockClient({ boards: [{ name: 'Board', state: 'active' }] })
    const builder = new BoardQueryBuilder('42', client as any)
    await builder.returning({ name: true, state: true })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ boards(ids: 42) { name state } }')
  })

  it('returns null-equivalent data from the api as-is', async () => {
    const client = mockClient({ boards: [{ id: '1', board_folder_id: null }] })
    const builder = new BoardQueryBuilder('1', client as any)
    const result = await builder.returning({ id: true, board_folder_id: true })
    expect(result.board_folder_id).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────
// FolderQueryBuilder
// ──────────────────────────────────────────────────────────────

describe('FolderQueryBuilder.returning', () => {
  it('fetches scalar folder fields', async () => {
    const client = mockClient({ folders: [{ id: 'f1', name: 'Projects' }] })
    const builder = new FolderQueryBuilder('f1', client as any)
    const result = await builder.returning({ id: true, name: true })
    expect(result).toEqual({ id: 'f1', name: 'Projects' })
  })

  it('expands children with explicit field selection', async () => {
    const client = mockClient({ folders: [{ children: [{ id: 'b1', name: 'Board A', created_at: '2024-01-01' }] }] })
    const builder = new FolderQueryBuilder('f1', client as any)
    await builder.returning({ children: { id: true, name: true, created_at: true } })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ folders(ids: f1) { children { id name created_at } } }')
  })

  it('includes parent { id name } when parent: true', async () => {
    const client = mockClient({ folders: [{ parent: { id: 'p1', name: 'Root' } }] })
    const builder = new FolderQueryBuilder('f1', client as any)
    await builder.returning({ parent: true })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ folders(ids: f1) { parent { id name } } }')
  })

  it('includes sub_folders { id name } when sub_folders: true', async () => {
    const client = mockClient({ folders: [{ sub_folders: [{ id: 's1', name: 'Sub' }] }] })
    const builder = new FolderQueryBuilder('f1', client as any)
    await builder.returning({ sub_folders: true })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ folders(ids: f1) { sub_folders { id name } } }')
  })

  it('combines scalars, parent, sub_folders, and children', async () => {
    const client = mockClient({ folders: [{}] })
    const builder = new FolderQueryBuilder('f1', client as any)
    await builder.returning({ id: true, name: true, parent: true, sub_folders: true, children: { id: true, name: true } })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ folders(ids: f1) { id name parent { id name } sub_folders { id name } children { id name } } }')
  })

  it('returns null parent when api returns null', async () => {
    const client = mockClient({ folders: [{ parent: null }] })
    const builder = new FolderQueryBuilder('f1', client as any)
    const result = await builder.returning({ parent: true })
    expect((result as any).parent).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────
// WebhookQueryBuilder
// ──────────────────────────────────────────────────────────────

describe('WebhookQueryBuilder.returning', () => {
  it('returns id and event when selected', async () => {
    const client = mockClient({ webhooks: [{ id: 'w1', event: 'create_item' }] })
    const builder = new WebhookQueryBuilder('123', client as any)
    const result = await builder.returning({ id: true, event: true })
    expect(result).toEqual([{ id: 'w1', event: 'create_item' }])
  })

  it('parses config string into structured object', async () => {
    const client = mockClient({ webhooks: [{ id: 'w1', config: '{"columnId":"status__1","columnValue":{"index":1}}' }] })
    const builder = new WebhookQueryBuilder('123', client as any)
    const result = await builder.returning({ id: true, config: true })
    expect(result[0].config).toEqual({ column: 'status__1', labelIndex: 1, groupId: undefined })
  })

  it('handles malformed config gracefully', async () => {
    const client = mockClient({ webhooks: [{ id: 'w1', config: 'not-json' }] })
    const builder = new WebhookQueryBuilder('123', client as any)
    const result = await builder.returning({ id: true, config: true })
    expect(result[0].config).toEqual({})
  })

  it('returns empty array when board has no webhooks', async () => {
    const client = mockClient({ webhooks: [] })
    const builder = new WebhookQueryBuilder('123', client as any)
    const result = await builder.returning({ id: true })
    expect(result).toEqual([])
  })

  it('sends query with only selected fields', async () => {
    const client = mockClient({ webhooks: [] })
    const builder = new WebhookQueryBuilder('123', client as any)
    await builder.returning({ id: true, event: true })
    const query = n(client.run.mock.calls[0][0])
    expect(query).toBe('{ webhooks(board_id: 123) { id event } }')
  })
})
