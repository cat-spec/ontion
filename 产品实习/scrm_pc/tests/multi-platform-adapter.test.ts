import { describe, expect, it } from 'vitest'
import { getPlatformAdapter } from '../electron/platform-adapters'

describe('multi-platform adapters', () => {
  it.each([
    ['whatsapp', 'https://web.whatsapp.com/', 'whatsapp.cjs'] as const,
    ['telegram', 'https://web.telegram.org/a/', 'telegram.cjs'] as const,
    ['telegramk', 'https://web.telegram.org/k/', 'telegramk.cjs'] as const,
  ])('registers %s with URL allow-listing and event normalization', (platformId, allowedUrl, preloadEntry) => {
    const adapter = getPlatformAdapter(platformId)

    expect(adapter?.id).toBe(platformId)
    expect(adapter?.entryUrl).toBe(allowedUrl)
    expect(adapter?.preloadEntry).toBe(preloadEntry)
    expect(adapter?.isUrlAllowed(allowedUrl)).toBe(true)
    expect(adapter?.isUrlAllowed('tg://resolve?domain=test')).toBe(false)
    expect(adapter?.isUrlAllowed('https://example.com/')).toBe(false)

    const event = adapter?.normalizeEvent({
      sessionId: `${platformId}-0001`,
      direction: 'incoming',
      conversationKey: 'conv-1',
      text: ' hello ',
      timestamp: 1710000000000,
    })

    expect(event).toMatchObject({
      platformId,
      sessionId: `${platformId}-0001`,
      direction: 'incoming',
      conversationKey: 'conv-1',
      text: 'hello',
    })
    expect(event?.messageKey).toBe('incoming:conv-1:1710000000000:hello')
  })
})
