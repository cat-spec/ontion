export type PlatformId =
  | 'douyin'
  | 'whatsapp'
  | 'telegram'
  | 'telegramk'

export type WorkspaceMode = 'home' | 'settings' | 'container'
export type PlatformLoginState = 'idle' | 'loading' | 'qr_required' | 'logged_in' | 'error'
export type PlatformContainerState = 'detached' | 'attached' | 'hidden'
export type PlatformCaptureState = 'idle' | 'observing' | 'selector_missing' | 'error'
export type PlatformMessageDirection = 'incoming' | 'outgoing'

export interface PlatformSessionRecord {
  id: string
  platformId: PlatformId
  title: string
  partition: string
  entryUrl: string
  loginState: PlatformLoginState
  containerState: PlatformContainerState
  captureState: PlatformCaptureState
  createdAt: number
}

export interface PlatformSessionRuntimeState {
  sessionId: string
  platformId: PlatformId
  loginState: PlatformLoginState
  containerState: PlatformContainerState
  captureState: PlatformCaptureState
  lastError?: string
  activeUrl?: string
}

export interface PlatformCaptureEvent {
  platformId: PlatformId
  sessionId: string
  direction: PlatformMessageDirection
  conversationKey: string
  messageKey: string
  text: string
  timestamp: number
  rawMeta: Record<string, unknown>
}

export interface PlatformContainerBounds {
  sessionId: string
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export interface RawPlatformCaptureEvent {
  sessionId: string
  direction: PlatformMessageDirection
  conversationKey?: string
  messageKey?: string
  text: string
  timestamp: number
  rawMeta?: Record<string, unknown>
}

export interface PlatformBridgeApi {
  isDesktop: boolean
  createSession(session: PlatformSessionRecord): Promise<PlatformSessionRuntimeState>
  openSession(sessionId: string): Promise<PlatformSessionRuntimeState | null>
  closeSession(sessionId: string): Promise<PlatformSessionRuntimeState | null>
  destroySession(sessionId: string): Promise<void>
  setBounds(bounds: PlatformContainerBounds): Promise<void>
  getSessionState(sessionId: string): Promise<PlatformSessionRuntimeState | null>
  onEvent(handler: (event: PlatformCaptureEvent) => void): () => void
  onStateChanged(handler: (state: PlatformSessionRuntimeState) => void): () => void
}
