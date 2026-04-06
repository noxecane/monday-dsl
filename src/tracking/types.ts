export type InternalEvent = 'on_new_item' | 'on_change_column' | 'on_change_status'

export type WebhookPayload<T = any> = ChallengePayload | ItemPayload<T>
export type ItemPayloadEvent<T = any> = CreateItemPayload<T> | UpdateColumnValuePayload<T>

export interface ChallengePayload {
  challenge: string
}

export interface ItemPayload<T = any> {
  event: ItemPayloadEvent<T>
}

export interface CreateItemPayload<T = any> {
  type: 'create_pulse'
  boardId: number
  pulseId: number
  pulseName: string
  groupId: string
  columnValues: T
  triggerTime: string
}

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

export interface StatusUpdate {
  label: { index: number; text: string; is_done: boolean }
}
