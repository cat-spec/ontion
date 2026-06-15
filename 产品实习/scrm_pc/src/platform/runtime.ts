import type {
  PlatformBridgeApi,
  PlatformCaptureEvent,
  PlatformContainerBounds,
  PlatformSessionRecord,
  PlatformSessionRuntimeState,
} from './contracts'

const noopBridge: PlatformBridgeApi = {
  isDesktop: false,
  async createSession(session: PlatformSessionRecord) {
    return {
      sessionId: session.id,
      platformId: session.platformId,
      loginState: session.loginState,
      containerState: session.containerState,
      captureState: session.captureState,
      activeUrl: session.entryUrl,
    }
  },
  async openSession() {
    return null
  },
  async closeSession() {
    return null
  },
  async destroySession() {},
  async setBounds(_bounds: PlatformContainerBounds) {},
  async getSessionState() {
    return null
  },
  onEvent(_handler: (event: PlatformCaptureEvent) => void) {
    return () => {}
  },
  onStateChanged(_handler: (state: PlatformSessionRuntimeState) => void) {
    return () => {}
  },
}

export function getPlatformBridge(): PlatformBridgeApi {
  return window.electronPlatform ?? noopBridge
}
