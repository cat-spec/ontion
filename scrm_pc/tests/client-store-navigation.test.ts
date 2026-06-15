import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('client store navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('detaches the active web container when leaving container mode', async () => {
    const { useClientStore } = await import('@/stores/client')
    const store = useClientStore()

    bridgeMock.createSession.mockResolvedValue({
      sessionId: 'douyin-0001',
      platformId: 'douyin',
      loginState: 'idle',
      containerState: 'detached',
      captureState: 'idle',
      activeUrl: 'https://www.douyin.com/',
    })

    bridgeMock.closeSession.mockResolvedValue({
      sessionId: 'douyin-0001',
      platformId: 'douyin',
      loginState: 'idle',
      containerState: 'hidden',
      captureState: 'idle',
      activeUrl: 'https://www.douyin.com/',
    })

    await store.createSession('douyin')
    await store.openSettings('platform')

    expect(bridgeMock.closeSession).toHaveBeenCalledWith('douyin-0001')
  })

  it('detaches the active web container when returning to the homepage', async () => {
    const { useClientStore } = await import('@/stores/client')
    const store = useClientStore()

    bridgeMock.createSession.mockResolvedValue({
      sessionId: 'douyin-0001',
      platformId: 'douyin',
      loginState: 'idle',
      containerState: 'detached',
      captureState: 'idle',
      activeUrl: 'https://www.douyin.com/',
    })

    bridgeMock.closeSession.mockResolvedValue({
      sessionId: 'douyin-0001',
      platformId: 'douyin',
      loginState: 'idle',
      containerState: 'hidden',
      captureState: 'idle',
      activeUrl: 'https://www.douyin.com/',
    })

    await store.createSession('douyin')
    await store.setActivePlatform('home')

    expect(bridgeMock.closeSession).toHaveBeenCalledWith('douyin-0001')
  })
})
