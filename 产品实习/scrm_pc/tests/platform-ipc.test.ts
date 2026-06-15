import { describe, expect, it } from 'vitest'
import { platformIpcChannels } from '../src/platform/ipc'

describe('platformIpcChannels', () => {
  it('exposes a dedicated guest debug log channel', () => {
    expect(platformIpcChannels.guestLog).toBe('platform:guest-log')
  })

  it('exposes translation channels for guest preloads', () => {
    expect(platformIpcChannels.translateText).toBe('platform:translate-text')
    expect(platformIpcChannels.languageList).toBe('platform:language-list')
  })
})
