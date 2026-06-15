import { describe, expect, it } from 'vitest'
import { douyinChatAdapter } from '../electron/platform-adapters/douyin'

describe('douyinChatAdapter', () => {
  it('normalizes raw capture events into renderer-safe payloads', () => {
    const event = douyinChatAdapter.normalizeEvent({
      sessionId: 'douyin-0001',
      direction: 'incoming',
      text: '你好，测试消息',
      timestamp: 1710000000000,
      conversationKey: 'conv-1',
      messageKey: '',
      rawMeta: {
        author: '客户A',
      },
    })

    expect(event.platformId).toBe('douyin')
    expect(event.sessionId).toBe('douyin-0001')
    expect(event.direction).toBe('incoming')
    expect(event.conversationKey).toBe('conv-1')
    expect(event.messageKey).toBe('incoming:conv-1:1710000000000:你好，测试消息')
    expect(event.rawMeta).toEqual({ author: '客户A' })
  })

  it('rejects URLs outside the allowed host list', () => {
    expect(douyinChatAdapter.isUrlAllowed('https://www.douyin.com/')).toBe(true)
    expect(douyinChatAdapter.isUrlAllowed('https://imdesktop.douyin.com/')).toBe(true)
    expect(douyinChatAdapter.isUrlAllowed('bytedance://dispatch_message/')).toBe(false)
    expect(douyinChatAdapter.isUrlAllowed('https://example.com/im')).toBe(false)
  })
})
