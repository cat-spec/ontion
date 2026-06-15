import { describe, expect, it } from 'vitest'
import { buildSessionDraft } from '@/platform/session'

describe('buildSessionDraft', () => {
  it('creates a douyin session with persistent partition and default states', () => {
    const session = buildSessionDraft({
      platformId: 'douyin',
      sequence: 3,
    })

    expect(session.id).toBe('douyin-0003')
    expect(session.partition).toBe('persist:nexscrm:douyin:douyin-0003')
    expect(session.entryUrl).toBe('https://www.douyin.com/')
    expect(session.loginState).toBe('idle')
    expect(session.containerState).toBe('detached')
    expect(session.captureState).toBe('idle')
    expect(session.title).toBe('抖音聊天')
  })
})
