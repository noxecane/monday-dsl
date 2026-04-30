import { MondayClient } from '../client'

export interface Board {
  id: string
  name: string
  description: string
  state: 'active' | 'archived' | 'deleted'
  board_kind: 'public' | 'private' | 'share'
  items_count: number
  created_at: string
  updated_at: string
  board_folder_id: string | null
}

export class BoardQueryBuilder {
  constructor(
    private boardId: string,
    private client: MondayClient
  ) {}

  async returning<K extends keyof Board>(selection: Record<K, true>): Promise<Pick<Board, K>> {
    const fields = Object.keys(selection).join('\n        ')
    const data = await this.client.run<any>(`{
      boards(ids: ${this.boardId}) {
        ${fields}
      }
    }`)
    return data.boards[0] as Pick<Board, K>
  }
}
