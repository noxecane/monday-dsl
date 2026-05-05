export type InternalEvent = 'on_new_item' | 'on_change_column' | 'on_change_status'

export type WebhookPayload<T = any> = ChallengePayload | ItemPayload<T>

export type ItemPayloadEvent<T = any> =
  | CreateItemPayload<T>
  | UpdateColumnValuePayload<T>
  | ItemArchivedPayload
  | ItemDeletedPayload
  | ItemRestoredPayload
  | ItemMovedToGroupPayload
  | ItemNameChangedPayload
  | CreateSubitemPayload
  | CreateUpdatePayload
  | EditUpdatePayload
  | DeleteUpdatePayload
  | CreateColumnPayload

export interface ChallengePayload {
  challenge: string
}

export interface ItemPayload<T = any> {
  event: ItemPayloadEvent<T>
}

// ── Item lifecycle ────────────────────────────────────────────────────────

export interface CreateItemPayload<T = any> {
  type: 'create_pulse'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  columnValues: T
  triggerTime: string
}

export interface ItemArchivedPayload {
  type: 'item_archived'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  triggerTime: string
}

export interface ItemDeletedPayload {
  type: 'item_deleted'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  triggerTime: string
}

export interface ItemRestoredPayload {
  type: 'item_restored'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  triggerTime: string
}

export interface ItemMovedToGroupPayload {
  type: 'item_moved_to_group'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  previousGroupId: string
  triggerTime: string
}

export interface ItemNameChangedPayload {
  type: 'update_name'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  previousValue: string
  value: string
  triggerTime: string
}

// ── Column change ─────────────────────────────────────────────────────────

export interface UpdateColumnValuePayload<T = any> {
  type: 'update_column_value'
  triggerTime: string
  boardId: number
  groupId: string
  pulseId: number
  pulseName: string
  columnId: string
  value: T
  previousValue?: T
  changedAt: number
}

// ── Subitems ──────────────────────────────────────────────────────────────

export interface CreateSubitemPayload {
  type: 'create_subitem'
  boardId: number
  pulseId: number
  pulseName: string
  parentItemId: number
  parentItemBoardId: number
  triggerTime: string
}

// ── Item updates (comments) ───────────────────────────────────────────────

export interface CreateUpdatePayload {
  type: 'create_update'
  boardId: number
  pulseId: number
  updateId: number
  userId: number
  triggerTime: string
}

export interface EditUpdatePayload {
  type: 'edit_update'
  boardId: number
  pulseId: number
  updateId: number
  userId: number
  triggerTime: string
}

export interface DeleteUpdatePayload {
  type: 'delete_update'
  boardId: number
  pulseId: number
  updateId: number
  userId: number
  triggerTime: string
}

// ── Board structure ───────────────────────────────────────────────────────

export interface CreateColumnPayload {
  type: 'create_column'
  boardId: number
  columnId: string
  columnType: string
  columnTitle: string
  triggerTime: string
}

// ── Column value shapes ───────────────────────────────────────────────────

export interface StatusUpdate {
  label: { index: number; text: string; is_done: boolean }
}

export interface DateUpdate {
  date: string
  time?: string
}

export interface PersonUpdate {
  id: number
  kind: 'person' | 'team'
}

export interface PeopleUpdate {
  personsAndTeams: PersonUpdate[]
}

export interface DropdownUpdate {
  chosenValues: Array<{ id: number; name: string }>
}

export interface ConnectUpdate {
  linkedPulseIds: Array<{ linkedPulseId: number }>
}

export interface TextUpdate {
  value: string
}

export interface NumberUpdate {
  value: string
}
