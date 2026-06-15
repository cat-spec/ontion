import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  ChatDotRound,
  Connection,
  Grid,
  House,
  Iphone,
  Message,
  Platform,
  Promotion,
  Setting,
  Star,
} from '@element-plus/icons-vue'
import { buildSessionDraft } from '@/platform/session'
import { getPlatformBridge } from '@/platform/runtime'
import type {
  PlatformCaptureEvent,
  PlatformCaptureState,
  PlatformId,
  PlatformLoginState,
  PlatformSessionRecord,
  PlatformSessionRuntimeState,
  WorkspaceMode,
} from '@/platform/contracts'

export interface PlatformItem {
  id: PlatformId
  name: string
  badge: string
  color: string
  icon: typeof House
  online: boolean
}

export interface HomeItem {
  id: 'home'
  name: string
  color: string
  icon: typeof House
}

const bridge = getPlatformBridge()
let bridgeListenersBound = false

export const useClientStore = defineStore('client', () => {
  const activePlatformId = ref<'home' | PlatformId>('home')
  const activeUtilityId = ref('')
  const activeAppId = ref<'keyword-reply' | 'welcome-reply'>('keyword-reply')
  const activeSettingsMenu = ref('platform')
  const activeSessionId = ref('')
  const workspaceMode = ref<WorkspaceMode>('home')
  const sessionSequence = ref(0)
  const sessions = ref<PlatformSessionRecord[]>([])
  const sessionStates = ref<Record<string, PlatformSessionRuntimeState>>({})
  const captureEvents = ref<PlatformCaptureEvent[]>([])
  const hostVersion = ref(0)

  const homeItem: HomeItem = {
    id: 'home',
    name: '工作台首页',
    color: '#2563eb',
    icon: House,
  }

  const platforms: PlatformItem[] = [
    { id: 'douyin', name: '抖音聊天', badge: 'DY', color: '#0f172a', icon: ChatDotRound, online: true },
    { id: 'whatsapp', name: 'WhatsApp', badge: 'WA', color: '#22c55e', icon: ChatDotRound, online: true },
    { id: 'telegram', name: 'Telegram', badge: 'TG', color: '#0ea5e9', icon: Promotion, online: true },
    { id: 'line', name: 'Line', badge: 'LINE', color: '#06c755', icon: Message, online: false },
    { id: 'instagram', name: 'Instagram', badge: 'IG', color: '#ec4899', icon: Star, online: true },
    { id: 'messenger', name: 'Messenger', badge: 'MS', color: '#2563eb', icon: Connection, online: false },
    { id: 'facebook', name: 'Facebook', badge: 'FB', color: '#1877f2', icon: Platform, online: false },
    { id: 'x', name: 'X', badge: 'X', color: '#111827', icon: Platform, online: false },
    { id: 'zalo', name: 'Zalo', badge: 'ZA', color: '#0b82ff', icon: Iphone, online: false },
  ]

  const utilityItems = [
    { id: 'apps', name: '功能应用', icon: Grid },
    { id: 'settings', name: '系统设置', icon: Setting },
  ]

  const activePlatform = computed(
    () => homeItem.id === activePlatformId.value
      ? homeItem
      : platforms.find((platform) => platform.id === activePlatformId.value) || homeItem,
  )

  const onlineCount = computed(() => platforms.filter((platform) => platform.online).length)
  const offlineCount = computed(() => platforms.length - onlineCount.value)

  const activeSessions = computed(() =>
    sessions.value.filter((session) => session.platformId === activePlatformId.value),
  )

  const activeSession = computed(() =>
    sessions.value.find((session) => session.id === activeSessionId.value) || null,
  )

  const activeSessionState = computed(() =>
    activeSessionId.value ? sessionStates.value[activeSessionId.value] ?? null : null,
  )

  const activeCaptureEvents = computed(() =>
    captureEvents.value.filter((event) => event.sessionId === activeSessionId.value),
  )

  const activeStatusLabel = computed(() => {
    const state = activeSessionState.value
    if (!state) {
      return '未附着容器'
    }

    const loginMap: Record<PlatformLoginState, string> = {
      idle: '等待打开',
      loading: '载入中',
      qr_required: '等待扫码',
      logged_in: '已登录',
      error: '登录异常',
    }

    const captureMap: Record<PlatformCaptureState, string> = {
      idle: '等待监听',
      observing: '监听中',
      selector_missing: '选择器失效',
      error: '监听异常',
    }

    return `${loginMap[state.loginState]} / ${captureMap[state.captureState]}`
  })

  const activeStatusDetail = computed(() => activeSessionState.value?.lastError || '')

  function bindBridgeListeners() {
    if (bridgeListenersBound) {
      return
    }

    bridge.onEvent((event) => {
      const exists = captureEvents.value.some((item) => item.messageKey === event.messageKey)
      if (!exists) {
        captureEvents.value = [event, ...captureEvents.value].slice(0, 300)
      }
    })

    bridge.onStateChanged((state) => {
      sessionStates.value = {
        ...sessionStates.value,
        [state.sessionId]: state,
      }
    })

    bridgeListenersBound = true
  }

  bindBridgeListeners()

  function setWorkspaceMode(nextMode: WorkspaceMode) {
    workspaceMode.value = nextMode
  }

  function applyRuntimeState(runtime: PlatformSessionRuntimeState | null) {
    if (!runtime) {
      return
    }

    sessionStates.value = {
      ...sessionStates.value,
      [runtime.sessionId]: runtime,
    }
  }

  async function detachSession(sessionId: string) {
    if (!sessionId) {
      return null
    }

    const runtime = await bridge.closeSession(sessionId)
    applyRuntimeState(runtime)
    return runtime
  }

  function detachActiveSessionIfNeeded(nextSessionId = '') {
    const currentSessionId = activeSessionId.value
    if (!currentSessionId || currentSessionId === nextSessionId) {
      return
    }

    void detachSession(currentSessionId)
  }

  function setActivePlatform(id: 'home' | PlatformId) {
    const nextSessionId = sessions.value.find((session) => session.platformId === id)?.id ?? ''
    detachActiveSessionIfNeeded(nextSessionId)
    activeUtilityId.value = ''
    activePlatformId.value = id
    workspaceMode.value = id === homeItem.id ? 'home' : 'container'
    activeSessionId.value = nextSessionId
    hostVersion.value += 1
  }

  function setActiveUtility(id: string) {
    if (id) {
      detachActiveSessionIfNeeded()
    }

    activeUtilityId.value = id
    workspaceMode.value = id === 'settings' ? 'settings' : workspaceMode.value
  }

  function setActiveSettingsMenu(id: string) {
    activeSettingsMenu.value = id
  }

  function openSettings(menuId = activeSettingsMenu.value) {
    detachActiveSessionIfNeeded()
    activeSettingsMenu.value = menuId
    activeUtilityId.value = 'settings'
    workspaceMode.value = 'settings'
  }

  function openQuickReply() {
    detachActiveSessionIfNeeded()
    activeUtilityId.value = 'quick-reply'
    workspaceMode.value = 'home'
  }

  function openFeatureApp(appId: typeof activeAppId.value) {
    detachActiveSessionIfNeeded()
    activeAppId.value = appId
    activeUtilityId.value = 'apps'
    workspaceMode.value = 'home'
  }

  async function createSession(platformId?: PlatformId) {
    const targetPlatformId = platformId ?? (activePlatformId.value === 'home' ? 'douyin' : activePlatformId.value)
    sessionSequence.value += 1
    const draft = buildSessionDraft({
      platformId: targetPlatformId,
      sequence: sessionSequence.value,
    })

    const state = await bridge.createSession(draft)
    sessions.value = [draft, ...sessions.value]
    sessionStates.value = {
      ...sessionStates.value,
      [state.sessionId]: state,
    }
    activePlatformId.value = draft.platformId
    activeSessionId.value = draft.id
    workspaceMode.value = 'container'
    hostVersion.value += 1
  }

  async function openSession(sessionId: string) {
    activeSessionId.value = sessionId
    workspaceMode.value = 'container'
    activeUtilityId.value = ''

    const runtime = await bridge.openSession(sessionId)
    applyRuntimeState(runtime)

    hostVersion.value += 1
  }

  async function closeSession(sessionId: string) {
    await detachSession(sessionId)
  }

  async function destroySession(sessionId: string) {
    await bridge.destroySession(sessionId)
    sessions.value = sessions.value.filter((session) => session.id !== sessionId)
    captureEvents.value = captureEvents.value.filter((event) => event.sessionId !== sessionId)

    const nextState = { ...sessionStates.value }
    delete nextState[sessionId]
    sessionStates.value = nextState

    if (activeSessionId.value === sessionId) {
      const fallback = activeSessions.value[0] || sessions.value.find((session) => session.platformId === activePlatformId.value)
      activeSessionId.value = fallback?.id ?? ''
      if (!activeSessionId.value) {
        hostVersion.value += 1
      }
    }
  }

  async function syncSessionState(sessionId: string) {
    const state = await bridge.getSessionState(sessionId)
    if (state) {
      sessionStates.value = {
        ...sessionStates.value,
        [state.sessionId]: state,
      }
    }
  }

  function getSessionState(sessionId: string) {
    return sessionStates.value[sessionId] ?? null
  }

  function markSessionProxyPending(sessionId: string) {
    const state = sessionStates.value[sessionId]
    if (!state) {
      return
    }

    sessionStates.value = {
      ...sessionStates.value,
      [sessionId]: {
        ...state,
        lastError: '全局代理能力将在第二阶段接入',
      },
    }
  }

  return {
    activeCaptureEvents,
    activePlatform,
    activePlatformId,
    activeAppId,
    activeSession,
    activeSessionId,
    activeSessionState,
    activeSessions,
    activeSettingsMenu,
    activeStatusLabel,
    activeStatusDetail,
    activeUtilityId,
    captureEvents,
    createSession,
    destroySession,
    getSessionState,
    homeItem,
    hostVersion,
    offlineCount,
    onlineCount,
    openSession,
    platforms,
    sessions,
    sessionStates,
    setActivePlatform,
    setActiveSettingsMenu,
    setActiveUtility,
    setWorkspaceMode,
    syncSessionState,
    utilityItems,
    workspaceMode,
    closeSession,
    markSessionProxyPending,
    openFeatureApp,
    openQuickReply,
    openSettings,
    isDesktopRuntime: bridge.isDesktop,
  }
})
