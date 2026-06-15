import { describe, expect, it } from 'vitest'
import { platformIpcChannels } from '../src/platform/ipc'

describe('platformIpcChannels', () => {
  it('exposes a dedicated guest debug log channel', () => {
    expect(platformIpcChannels.guestLog).toBe('platform:guest-log')
  })
})
