import { MondayClient } from '../client'
import { Board } from './board'

export interface FolderScalars {
  id: string
  name: string
  created_at: string
}

export interface FolderRef {
  id: string
  name: string
}

type FolderScalarSelection = { id?: true; name?: true; created_at?: true; parent?: true; sub_folders?: true }

type FolderResult<T extends FolderScalarSelection, KC extends keyof Board> =
  (T extends { id: true } ? { id: string } : {}) &
  (T extends { name: true } ? { name: string } : {}) &
  (T extends { created_at: true } ? { created_at: string } : {}) &
  (T extends { parent: true } ? { parent: FolderRef | null } : {}) &
  (T extends { sub_folders: true } ? { sub_folders: Array<FolderRef> } : {}) &
  ([KC] extends [never] ? {} : { children: Array<Pick<Board, KC>> })

export class FolderQueryBuilder {
  constructor(private folderId: string, private client: MondayClient) {}

  async returning<T extends FolderScalarSelection, KC extends keyof Board = never>(
    selection: T & { children?: Record<KC, true> }
  ): Promise<FolderResult<T, KC>> {
    const NESTED_STATIC = new Set(['parent', 'sub_folders'])
    const sel = selection as any

    const scalars = Object.keys(sel).filter(k => !NESTED_STATIC.has(k) && k !== 'children' && sel[k])
    const nested = [
      sel.parent      ? 'parent { id name }'       : '',
      sel.sub_folders ? 'sub_folders { id name }'  : '',
      sel.children    ? `children { ${Object.keys(sel.children).filter((k: string) => sel.children[k]).join(' ')} }` : '',
    ].filter(Boolean)

    const fields = [...scalars, ...nested].join('\n        ')
    const data = await this.client.run<any>(`{
      folders(ids: ${this.folderId}) {
        ${fields}
      }
    }`)

    return data.folders[0] as any
  }
}
