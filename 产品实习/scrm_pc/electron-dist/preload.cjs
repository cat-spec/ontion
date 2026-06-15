// electron/preload.ts
var import_electron = require("electron");

// src/platform/ipc.ts
var platformIpcChannels = {
  createSession: "platform:create-session",
  openSession: "platform:open-session",
  closeSession: "platform:close-session",
  setBounds: "platform:set-bounds",
  destroySession: "platform:destroy-session",
  getSessionState: "platform:get-session-state",
  event: "platform:event",
  stateChanged: "platform:state-changed",
  guestEvent: "platform:guest-event",
  guestStateChanged: "platform:guest-state-changed",
  guestLog: "platform:guest-log",
  translateText: "platform:translate-text",
  languageList: "platform:language-list"
};

// electron/preload.ts
var platformBridge = {
  isDesktop: true,
  // 只在主进程登记会话记录，不立即创建/打开 WebContentsView。
  createSession(session) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.createSession, session);
  },
  // 打开会话会让主进程附着对应 WebContentsView，并导航到平台入口页。
  openSession(sessionId) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.openSession, sessionId);
  },
  // 暂停附着只隐藏容器，不销毁 webContents 或持久化登录分区。
  closeSession(sessionId) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.closeSession, sessionId);
  },
  // 删除会话会销毁主进程中的 WebContentsView 和运行态。
  destroySession(sessionId) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.destroySession, sessionId);
  },
  // renderer 根据 DOM 宿主区域实时上报 bounds，主进程据此移动原生容器。
  setBounds(bounds) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.setBounds, bounds);
  },
  // 手动刷新当前 session runtime state。
  getSessionState(sessionId) {
    return import_electron.ipcRenderer.invoke(platformIpcChannels.getSessionState, sessionId);
  },
  // 订阅 guest preload 捕获并由主进程转发的标准消息事件。
  onEvent(handler) {
    const listener = (_event, payload) => handler(payload);
    import_electron.ipcRenderer.on(platformIpcChannels.event, listener);
    return () => import_electron.ipcRenderer.removeListener(platformIpcChannels.event, listener);
  },
  // 订阅容器加载、登录态、捕获态等运行状态变化。
  onStateChanged(handler) {
    const listener = (_event, payload) => handler(payload);
    import_electron.ipcRenderer.on(platformIpcChannels.stateChanged, listener);
    return () => import_electron.ipcRenderer.removeListener(platformIpcChannels.stateChanged, listener);
  }
};
import_electron.contextBridge.exposeInMainWorld("electronPlatform", platformBridge);
//# sourceMappingURL=preload.cjs.map
