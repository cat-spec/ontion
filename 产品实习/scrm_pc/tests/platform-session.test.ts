import { describe, expect, it } from 'vitest'
import { buildSessionDraft } from '@/platform/session'

describe('buildSessionDraft', () => {
  it.each([
    {
      platformId: 'douyin' as const,
      title: '抖音聊天',
      entryUrl: 'https://www.douyin.com/',
    },
    {
      platformId: 'whatsapp' as const,
      title: 'WhatsApp',
      entryUrl: 'https://web.whatsapp.com/',
    },
    {
      platformId: 'telegram' as const,
      title: 'Telegram',
      entryUrl: 'https://web.telegram.org/a/',
    },
    {
      platformId: 'telegramk' as const,
      title: 'TelegramK',
      entryUrl: 'https://web.telegram.org/k/',
    },
  ])('creates a $platformId session with persistent partition and default states', ({ platformId, title, entryUrl }) => {
    const session = buildSessionDraft({
      platformId,
      sequence: 3,
    })

    expect(session.id).toBe(`${platformId}-0003`)
    expect(session.partition).toBe(`persist:nexscrm:${platformId}:${platformId}-0003`)
    expect(session.entryUrl).toBe(entryUrl)
    expect(session.loginState).toBe('idle')
    expect(session.containerState).toBe('detached')
    expect(session.captureState).toBe('idle')
    expect(session.title).toBe(title)
  })
})
