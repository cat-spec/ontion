import { describe, expect, it } from 'vitest'
import {
  buildPlatformMessageKey,
  extractEditableText,
  normalizePlatformText,
  splitOutgoingLines,
  shouldSkipTranslation,
} from '../electron/platform-preload/multi-platform-capture'

describe('multi-platform capture helpers', () => {
  it('normalizes message text and skips empty translations', () => {
    expect(normalizePlatformText('  hello\n\nworld  ')).toBe('hello world')
    expect(shouldSkipTranslation('   ')).toBe(true)
    expect(shouldSkipTranslation('hello')).toBe(false)
  })

  it('builds stable message keys for normalized text', () => {
    expect(buildPlatformMessageKey({
      direction: 'incoming',
      conversationKey: 'chat-a',
      timestamp: 1710000000000,
      text: '  hello  ',
    })).toBe('incoming:chat-a:1710000000000:hello')
  })

  it('extracts editable text with line breaks and emoji alt text', () => {
    const root = {
      nodeType: 1,
      childNodes: [
        { nodeType: 3, textContent: 'hello' },
        { nodeType: 1, tagName: 'BR', textContent: '' },
        {
          nodeType: 1,
          tagName: 'IMG',
          alt: '🙂',
          textContent: '',
          classList: { contains: (className: string) => className === 'emoji' },
        },
        { nodeType: 3, textContent: 'world' },
      ],
    }

    expect(extractEditableText(root)).toBe('hello\n🙂world')
  })

  it('splits outgoing text into non-empty lines', () => {
    expect(splitOutgoingLines(' hello \n\n world ')).toEqual(['hello', 'world'])
  })
})
