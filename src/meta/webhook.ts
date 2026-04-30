import { MondayClient } from '../client'
import { WebhookEvent } from '../admin'

export interface WebhookConfig {
  column?: string
  labelIndex?: number
  groupId?: string
}

export interface Webhook {
  id: string
  event: WebhookEvent
  config: WebhookConfig
}

function parseConfig(raw: string): WebhookConfig {
  try {
    const parsed = JSON.parse(raw.replace(/=>/g, ':'))
    return { column: parsed.columnId, labelIndex: parsed.columnValue?.index, groupId: parsed.groupId }
  } catch {
    return {}
  }
}

export class WebhookQueryBuilder {
  constructor(private boardId: string, private client: MondayClient) {}

  async returning<K extends keyof Webhook>(selection: Record<K, true>): Promise<Array<Pick<Webhook, K>>> {
    const fields = (Object.keys(selection) as K[]).join('\n        ')
    const data = await this.client.run<any>(`{
      webhooks(board_id: ${this.boardId}) {
        ${fields}
      }
    }`)

    return (data.webhooks || []).map((webhook: any) => {
      const result: any = {}
      if ('id' in selection) result.id = webhook.id
      if ('event' in selection) result.event = webhook.event
      if ('config' in selection) result.config = parseConfig(webhook.config)
      return result
    }) as Array<Pick<Webhook, K>>
  }
}
