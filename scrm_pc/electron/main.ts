import { app, BrowserWindow, WebContentsView, ipcMain, session } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type {
  PlatformCaptureEvent,
  PlatformContainerBounds,
  PlatformSessionRecord,
  PlatformSessionRuntimeState,
  RawPlatformCaptureEvent,
} from '../src/platform/contracts'
import { platformIpcChannels } from '../src/platform/ipc'
import { getPlatformAdapter } from './platform-adapters'

// 当前文件是 Electron 主进程入口：
// 1. 创建承载 Vue 工作台的主窗口。
// 2. 为第三方平台创建 WebContentsView 容器。
// 3. 维护 sessionId -> WebContentsView / runtime state 的映射。
// 4. 作为 guest preload 与 renderer 之间的 IPC 中转层。
const __dirname = path.dirname(__filename)
const rendererDistPath = path.resolve(__dirname, '../dist/index.html')
const preloadPath = path.resolve(__dirname, './preload.cjs')
const guestPreloadRoot = path.resolve(__dirname, './platform-preload')
const devServerUrl = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null
let activeSessionId: string | null = null

// MVP 阶段所有运行态都放在主进程内存中；后续如果要持久化，可从这里替换为数据库/文件存储。
const sessionRecords = new Map<string, PlatformSessionRecord>()
const sessionStates = new Map<string, PlatformSessionRuntimeState>()
const sessionViews = new Map<string, WebContentsView>()
const sessionBounds = new Map<string, PlatformContainerBounds>()
const webContentsToSessionId = new Map<number, string>()

// 用会话静态记录 + 局部更新字段生成统一 runtime state，避免各 IPC 分支重复拼装状态。
function buildState(record: PlatformSessionRecord, partial?: Partial<PlatformSessionRuntimeState>): PlatformSessionRuntimeState {
  return {
    sessionId: record.id,
    platformId: record.platformId,
    loginState: partial?.loginState ?? record.loginState,
    containerState: partial?.containerState ?? record.containerState,
    captureState: partial?.captureState ?? record.captureState,
    lastError: partial?.lastError,
    activeUrl: partial?.activeUrl ?? record.entryUrl,
  }
}

// 状态变更只从主进程单点广播，renderer 通过 store 订阅后更新 UI。
function broadcastState(state: PlatformSessionRuntimeState) {
  sessionStates.set(state.sessionId, state)
  mainWindow?.webContents.send(platformIpcChannels.stateChanged, state)
}

// guest preload 捕获到的标准消息事件经主进程转发给 renderer 时间线。
function broadcastEvent(event: PlatformCaptureEvent) {
  mainWindow?.webContents.send(platformIpcChannels.event, event)
}

// 平台 preload 会被编译到 electron-dist/platform-preload 下，这里只负责解析编译后入口。
function resolveGuestPreload(preloadEntry: string) {
  return path.resolve(guestPreloadRoot, preloadEntry)
}

// 主窗口只加载我们自己的 Vue renderer；第三方平台页面不会进入 renderer DOM。
function ensureMainWindow() {
  if (mainWindow) {
    return mainWindow
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 840,
    backgroundColor: '#f1f5f9',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else if (existsSync(rendererDistPath)) {
    void mainWindow.loadFile(rendererDistPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

// 只把 WebContentsView 从窗口树中移除，不销毁 webContents；用于切换会话时隐藏旧容器。
function detachView(sessionId: string) {
  const view = sessionViews.get(sessionId)
  if (!view || !mainWindow) {
    return
  }

  try {
    mainWindow.contentView.removeChildView(view)
  } catch {
    // Ignore if view is already detached.
  }
}

// 删除会话时必须销毁对应 WebContentsView，并清理 webContentsId -> sessionId 映射。
function destroyView(sessionId: string) {
  const view = sessionViews.get(sessionId)
  if (!view) {
    return
  }

  detachView(sessionId)
  webContentsToSessionId.delete(view.webContents.id)
  sessionViews.delete(sessionId)
  view.webContents.close()
}

// renderer 通过 ResizeObserver 上报 DOM 宿主区域，这里同步到原生 WebContentsView bounds。
function updateGuestBounds(sessionId: string) {
  const bounds = sessionBounds.get(sessionId)
  const view = sessionViews.get(sessionId)

  if (!bounds || !view) {
    return
  }

  if (!bounds.visible || bounds.width <= 0 || bounds.height <= 0) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    return
  }

  view.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  })
}

// 所有 guest 导航都必须经过平台白名单，避免容器被跳转到不可控域名或外部协议。
function enforceAllowedUrl(sessionId: string, url: string) {
  const record = sessionRecords.get(sessionId)
  if (!record) {
    return false
  }

  const adapter = getPlatformAdapter(record.platformId)
  return adapter?.isUrlAllowed(url) ?? false
}

// 为一个平台会话创建独立 WebContentsView：
// - partition 使用持久化分区，保证扫码登录态可复用。
// - preload 使用平台专属脚本，避免污染主窗口 renderer。
// - webContents.id 会映射回 sessionId，用于识别 guest IPC 来源。
function createGuestView(record: PlatformSessionRecord) {
  const adapter = getPlatformAdapter(record.platformId)
  if (!adapter) {
    throw new Error(`Platform adapter not implemented: ${record.platformId}`)
  }

  const guestSession = session.fromPartition(record.partition, { cache: true })
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      preload: resolveGuestPreload(adapter.preloadEntry),
      partition: record.partition,
      session: guestSession,
    },
  })
view.webContents.openDevTools({ mode: 'detach' })
  webContentsToSessionId.set(view.webContents.id, record.id)

  // 主导航入口防护：用户在容器内点击导致的页面跳转也必须满足白名单。
  view.webContents.on('will-navigate', (event, url) => {
    if (!enforceAllowedUrl(record.id, url)) {
      event.preventDefault()
    }
  })

  // 新窗口请求不真正新开系统窗口；只允许白名单 URL，其他外链直接拒绝。
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!enforceAllowedUrl(record.id, url)) {
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  // Electron 自身加载状态只能说明页面开始加载；真实登录/捕获状态由 guest preload 再上报。
  view.webContents.on('did-start-loading', () => {
    broadcastState(buildState(record, {
      loginState: 'loading',
      containerState: record.id === activeSessionId ? 'attached' : 'hidden',
      activeUrl: view.webContents.getURL() || record.entryUrl,
    }))
  })

  // 导航完成后保留已有 captureState，避免页面跳转把 DOM 监听状态直接清空。
  view.webContents.on('did-navigate', (_event, url) => {
    const previous = sessionStates.get(record.id)
    broadcastState(buildState(record, {
      loginState: previous?.loginState ?? 'loading',
      containerState: record.id === activeSessionId ? 'attached' : 'hidden',
      captureState: previous?.captureState ?? 'idle',
      activeUrl: url,
    }))
  })

  // guest console 统一带 session 信息输出，方便调试多个平台容器时区分来源。
  view.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelLabel = ['debug', 'info', 'warn', 'error'][level] ?? `level-${level}`
    console.log(`[guest:${record.platformId}:${record.id}:${levelLabel}] ${message} (${sourceId}:${line})`)
  })

  return view
}

// 打开/切换一个会话：创建或复用 WebContentsView，附着到主窗口并加载入口 URL。
function attachSession(record: PlatformSessionRecord) {
  const windowRef = ensureMainWindow()
  let view = sessionViews.get(record.id)

  if (!view) {
    view = createGuestView(record)
    sessionViews.set(record.id, view)
  }

  if (activeSessionId && activeSessionId !== record.id) {
    detachView(activeSessionId)
    const previous = sessionRecords.get(activeSessionId)
    if (previous) {
      broadcastState(buildState(previous, {
        ...sessionStates.get(previous.id),
        containerState: 'hidden',
      }))
    }
  }

  activeSessionId = record.id
  windowRef.contentView.addChildView(view)
  updateGuestBounds(record.id)

  const state = buildState(record, {
    ...sessionStates.get(record.id),
    containerState: 'attached',
  })
  broadcastState(state)

  if (!view.webContents.getURL()) {
    void view.webContents.loadURL(record.entryUrl)
  }

  return state
}

// renderer 创建会话时先登记静态 record；真正打开容器由 openSession 触发。
function createSessionRuntime(record: PlatformSessionRecord) {
  sessionRecords.set(record.id, record)
  const state = buildState(record)
  sessionStates.set(record.id, state)
  return state
}

// 应用启动入口：等待 Electron ready 后创建主窗口。
async function bootstrap() {
  await app.whenReady()
  ensureMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      ensureMainWindow()
    }
  })
}

// renderer 请求创建 session，仅登记状态，不创建 WebContentsView。
ipcMain.handle(platformIpcChannels.createSession, (_event, sessionRecord: PlatformSessionRecord) => {
  return createSessionRuntime(sessionRecord)
})

// renderer 请求打开 session，主进程负责附着 WebContentsView。
ipcMain.handle(platformIpcChannels.openSession, (_event, sessionId: string) => {
  const record = sessionRecords.get(sessionId)
  if (!record) {
    return null
  }

  return attachSession(record)
})

// 暂停附着只隐藏容器，不销毁持久分区和 webContents 登录态。
ipcMain.handle(platformIpcChannels.closeSession, (_event, sessionId: string) => {
  const record = sessionRecords.get(sessionId)
  if (!record) {
    return null
  }

  detachView(sessionId)
  if (activeSessionId === sessionId) {
    activeSessionId = null
  }

  const state = buildState(record, {
    ...sessionStates.get(sessionId),
    containerState: 'hidden',
  })
  broadcastState(state)
  return state
})

// 删除 session 会销毁视图和主进程内存态；持久分区数据当前不清理，便于 MVP 阶段保留登录态。
ipcMain.handle(platformIpcChannels.destroySession, (_event, sessionId: string) => {
  const record = sessionRecords.get(sessionId)
  if (record) {
    destroyView(sessionId)
    sessionRecords.delete(sessionId)
    sessionStates.delete(sessionId)
    sessionBounds.delete(sessionId)
    if (activeSessionId === sessionId) {
      activeSessionId = null
    }
  }
})

// renderer 每次右侧宿主区域 resize/scroll 后会上报 bounds，这里同步原生容器位置。
ipcMain.handle(platformIpcChannels.setBounds, (_event, bounds: PlatformContainerBounds) => {
  sessionBounds.set(bounds.sessionId, bounds)
  updateGuestBounds(bounds.sessionId)
})

// renderer 刷新状态时读取主进程当前缓存。
ipcMain.handle(platformIpcChannels.getSessionState, (_event, sessionId: string) => {
  return sessionStates.get(sessionId) ?? null
})

// guest preload 捕获到 DOM 消息后发到主进程；主进程补 sessionId 并交给平台适配器标准化。
ipcMain.on(platformIpcChannels.guestEvent, (event, rawPayload: RawPlatformCaptureEvent) => {
  const sessionId = webContentsToSessionId.get(event.sender.id)
  if (!sessionId) {
    return
  }

  const record = sessionRecords.get(sessionId)
  if (!record) {
    return
  }

  const adapter = getPlatformAdapter(record.platformId)
  if (!adapter) {
    return
  }

  const payload = adapter.normalizeEvent({
    ...rawPayload,
    sessionId,
  })
  broadcastEvent(payload)
})

// guest preload 上报页面登录/捕获状态，主进程合并后广播给 renderer。
ipcMain.on(platformIpcChannels.guestStateChanged, (event, partial: Partial<PlatformSessionRuntimeState>) => {
  const sessionId = webContentsToSessionId.get(event.sender.id)
  if (!sessionId) {
    return
  }

  const record = sessionRecords.get(sessionId)
  if (!record) {
    return
  }

  const previous = sessionStates.get(sessionId)
  broadcastState(buildState(record, {
    ...previous,
    ...partial,
  }))
})

// 专用 guest 调试通道，不依赖页面 console 转发，方便观察 preload 内部决策。
ipcMain.on(platformIpcChannels.guestLog, (event, payload: unknown) => {
  const sessionId = webContentsToSessionId.get(event.sender.id) ?? 'unknown'
  console.log(`[guest-log:${sessionId}]`, payload)
})

// macOS 以外平台关闭所有窗口后退出应用，符合 Electron 桌面默认行为。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

void bootstrap()
