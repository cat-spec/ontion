import { contextBridge, ipcRenderer } from 'electron'
import type {
  PlatformBridgeApi,
  PlatformCaptureEvent,
  PlatformContainerBounds,
  PlatformSessionRecord,
  PlatformSessionRuntimeState,
} from '../src/platform/contracts'
import { platformIpcChannels } from '../src/platform/ipc'

// 这个 preload 只注入到 Vue renderer 主窗口。
// 它把 Electron IPC 封装成受控的 window.electronPlatform API，避免 renderer 直接访问 ipcRenderer。
const platformBridge: PlatformBridgeApi = {
  isDesktop: true,
  // 只在主进程登记会话记录，不立即创建/打开 WebContentsView。
  createSession(session: PlatformSessionRecord) {
    return ipcRenderer.invoke(platformIpcChannels.createSession, session) as Promise<PlatformSessionRuntimeState>
  },
  // 打开会话会让主进程附着对应 WebContentsView，并导航到平台入口页。
  openSession(sessionId: string) {
    return ipcRenderer.invoke(platformIpcChannels.openSession, sessionId) as Promise<PlatformSessionRuntimeState | null>
  },
  // 暂停附着只隐藏容器，不销毁 webContents 或持久化登录分区。
  closeSession(sessionId: string) {
    return ipcRenderer.invoke(platformIpcChannels.closeSession, sessionId) as Promise<PlatformSessionRuntimeState | null>
  },
  // 删除会话会销毁主进程中的 WebContentsView 和运行态。
  destroySession(sessionId: string) {
    return ipcRenderer.invoke(platformIpcChannels.destroySession, sessionId) as Promise<void>
  },
  // renderer 根据 DOM 宿主区域实时上报 bounds，主进程据此移动原生容器。
  setBounds(bounds: PlatformContainerBounds) {
    return ipcRenderer.invoke(platformIpcChannels.setBounds, bounds) as Promise<void>
  },
  // 手动刷新当前 session runtime state。
  getSessionState(sessionId: string) {
    return ipcRenderer.invoke(platformIpcChannels.getSessionState, sessionId) as Promise<PlatformSessionRuntimeState | null>
  },
  // 订阅 guest preload 捕获并由主进程转发的标准消息事件。
  onEvent(handler: (event: PlatformCaptureEvent) => void) {
    const listener = (_event: unknown, payload: PlatformCaptureEvent) => handler(payload)
    ipcRenderer.on(platformIpcChannels.event, listener)
    return () => ipcRenderer.removeListener(platformIpcChannels.event, listener)
  },
  // 订阅容器加载、登录态、捕获态等运行状态变化。
  onStateChanged(handler: (state: PlatformSessionRuntimeState) => void) {
    const listener = (_event: unknown, payload: PlatformSessionRuntimeState) => handler(payload)
    ipcRenderer.on(platformIpcChannels.stateChanged, listener)
    return () => ipcRenderer.removeListener(platformIpcChannels.stateChanged, listener)
  },
}

// contextIsolation 开启时必须通过 contextBridge 暴露白名单 API。
contextBridge.exposeInMainWorld('electronPlatform', platformBridge)
