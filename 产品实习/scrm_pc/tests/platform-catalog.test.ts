import { describe, expect, it, vi } from 'vitest'
import { platformTargetCatalog } from '@/platform/catalog'
import { createPinia, setActivePinia } from 'pinia'

const bridgeMock = vi.hoisted(() => ({
  isDesktop: true,
  createSession: vi.fn(),
  openSession: vi.fn(),
  closeSession: vi.fn(),
  destroySession: vi.fn(),
  setBounds: vi.fn(),
  getSessionState: vi.fn(),
  onEvent: vi.fn(() => () => {}),
  onStateChanged: vi.fn(() => () => {}),
}))

vi.mock('@/platform/runtime', () => ({
  getPlatformBridge: () => bridgeMock,
}))

describe('supported platforms only', () => {
  it('exposes only the four implemented platform targets', () => {
    expect(Object.keys(platformTargetCatalog)).toEqual([
      'douyin',
      'whatsapp',
      'telegram',
      'telegramk',
    ])
  })

  it('shows only the four implemented platforms in the client store', async () => {
    setActivePinia(createPinia())
    const { useClientStore } = await import('@/stores/client')
    const store = useClientStore()

    expect(store.platforms.map((platform) => platform.id)).toEqual([
      'douyin',
      'whatsapp',
      'telegram',
      'telegramk',
    ])
  })
})
