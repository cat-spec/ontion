var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);

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

// electron/platform-adapters/douyin.ts
function buildFallbackMessageKey(event) {
  return `${event.direction}:${event.conversationKey ?? "unknown"}:${event.timestamp}:${event.text.trim()}`;
}
var douyinChatAdapter = {
  id: "douyin",
  entryUrl: "https://www.douyin.com",
  allowedHosts: ["imdesktop.douyin.com", "www.douyin.com"],
  preloadEntry: "douyin.cjs",
  // 当前配置主要用于记录和后续扩展；实际 MVP DOM 选择器在 douyin preload 内固定。
  createPreloadConfig() {
    return {
      platformId: "douyin",
      conversationSelectors: [
        '[data-e2e="im-message-list"]',
        '[class*="message-list"]'
      ],
      qrSelectors: [
        "canvas",
        'img[alt*="\u4E8C\u7EF4\u7801"]',
        '[class*="qrcode"]'
      ]
    };
  },
  // 将 guest preload 发来的原始事件补齐 platformId、conversationKey、messageKey 等标准字段。
  normalizeEvent(event) {
    return {
      platformId: "douyin",
      sessionId: event.sessionId,
      direction: event.direction,
      conversationKey: event.conversationKey ?? "unknown",
      messageKey: event.messageKey?.trim() || buildFallbackMessageKey(event),
      text: event.text.trim(),
      timestamp: event.timestamp,
      rawMeta: event.rawMeta ?? {}
    };
  },
  // 平台级登录态检测的兜底实现；当前实时状态主要由 douyin.ts preload 上报。
  detectLoginState(document) {
    if (document.location.host === "imdesktop.douyin.com") {
      return "idle";
    }
    if (document.querySelector('[data-e2e="im-message-list"], [class*="message-list"]')) {
      return "logged_in";
    }
    if (document.querySelector('canvas, img[alt*="\u4E8C\u7EF4\u7801"], [class*="qrcode"]')) {
      return "qr_required";
    }
    if (document.readyState !== "complete") {
      return "loading";
    }
    return "idle";
  },
  // 识别当前选中的会话名称，识别不到时由标准事件使用 unknown。
  detectConversation(document) {
    const target = document.querySelector('[data-e2e="conversation-active"], [class*="conversation"][class*="active"]');
    return target?.textContent?.trim() || null;
  },
  // 主进程导航白名单：只允许 http/https 且 host 在 allowedHosts 内，拦截 bytedance:// 等外部协议。
  isUrlAllowed(url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return false;
      }
      return this.allowedHosts.includes(parsed.host);
    } catch {
      return false;
    }
  }
};

// electron/platform-adapters/shared.ts
function buildFallbackMessageKey2(event) {
  return `${event.direction}:${event.conversationKey ?? "unknown"}:${event.timestamp}:${event.text.trim()}`;
}
function normalizePlatformEvent(platformId, event) {
  return {
    platformId,
    sessionId: event.sessionId,
    direction: event.direction,
    conversationKey: event.conversationKey ?? "unknown",
    messageKey: event.messageKey?.trim() || buildFallbackMessageKey2(event),
    text: event.text.trim(),
    timestamp: event.timestamp,
    rawMeta: event.rawMeta ?? {}
  };
}
function isAllowedHttpUrl(url, allowedHosts) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    return allowedHosts.includes(parsed.host);
  } catch {
    return false;
  }
}
function createWebChatAdapter(input) {
  return {
    id: input.id,
    entryUrl: input.entryUrl,
    allowedHosts: input.allowedHosts,
    preloadEntry: input.preloadEntry,
    createPreloadConfig() {
      return {
        platformId: input.id,
        loggedInSelectors: input.loggedInSelectors,
        qrSelectors: input.qrSelectors ?? []
      };
    },
    normalizeEvent(event) {
      return normalizePlatformEvent(input.id, event);
    },
    detectLoginState(document) {
      if (input.loggedInSelectors.some((selector) => document.querySelector(selector))) {
        return "logged_in";
      }
      if (input.qrSelectors?.some((selector) => document.querySelector(selector))) {
        return "qr_required";
      }
      if (document.readyState !== "complete") {
        return "loading";
      }
      return "idle";
    },
    detectConversation(document) {
      const target = document.querySelector('[aria-selected="true"], .active, [data-testid*="conversation"]');
      return target?.textContent?.trim() || null;
    },
    isUrlAllowed(url) {
      return isAllowedHttpUrl(url, input.allowedHosts);
    }
  };
}

// electron/platform-adapters/telegram.ts
var telegramChatAdapter = createWebChatAdapter({
  id: "telegram",
  entryUrl: "https://web.telegram.org/a/",
  allowedHosts: ["web.telegram.org"],
  preloadEntry: "telegram.cjs",
  loggedInSelectors: [
    "#LeftColumn-main",
    "#LeftColumn-main > div.NewChatButton",
    "div.chat-list"
  ],
  qrSelectors: ["canvas", ".qr-container", '[class*="qr"]']
});

// electron/platform-adapters/telegramk.ts
var telegramKChatAdapter = createWebChatAdapter({
  id: "telegramk",
  entryUrl: "https://web.telegram.org/k/",
  allowedHosts: ["web.telegram.org"],
  preloadEntry: "telegramk.cjs",
  loggedInSelectors: [
    "#chatlist-container",
    "#new-menu > div",
    "ul.chatlist"
  ],
  qrSelectors: ["canvas", ".qr-container", '[class*="qr"]']
});

// electron/platform-adapters/whatsapp.ts
var whatsappChatAdapter = createWebChatAdapter({
  id: "whatsapp",
  entryUrl: "https://web.whatsapp.com/",
  allowedHosts: ["web.whatsapp.com"],
  preloadEntry: "whatsapp.cjs",
  loggedInSelectors: [
    'footer div[contenteditable="true"]',
    'div[role="application"]',
    "#pane-side"
  ],
  qrSelectors: ["canvas", "div[data-ref]"]
});

// electron/platform-adapters/index.ts
var adapters = {
  douyin: douyinChatAdapter,
  whatsapp: whatsappChatAdapter,
  telegram: telegramChatAdapter,
  telegramk: telegramKChatAdapter
};
function getPlatformAdapter(platformId) {
  return adapters[platformId];
}

// electron/main.ts
var __dirname = import_node_path.default.dirname(__filename);
var rendererDistPath = import_node_path.default.resolve(__dirname, "../dist/index.html");
var preloadPath = import_node_path.default.resolve(__dirname, "./preload.cjs");
var guestPreloadRoot = import_node_path.default.resolve(__dirname, "./platform-preload");
var devServerUrl = process.env.VITE_DEV_SERVER_URL;
var translateServiceBaseUrl = process.env.NEXSCRM_TRANSLATE_BASE_URL || "http://localhost:8000";
var mainWindow = null;
var activeSessionId = null;
var sessionRecords = /* @__PURE__ */ new Map();
var sessionStates = /* @__PURE__ */ new Map();
var sessionViews = /* @__PURE__ */ new Map();
var sessionBounds = /* @__PURE__ */ new Map();
var webContentsToSessionId = /* @__PURE__ */ new Map();
function buildState(record, partial) {
  return {
    sessionId: record.id,
    platformId: record.platformId,
    loginState: partial?.loginState ?? record.loginState,
    containerState: partial?.containerState ?? record.containerState,
    captureState: partial?.captureState ?? record.captureState,
    lastError: partial?.lastError,
    activeUrl: partial?.activeUrl ?? record.entryUrl
  };
}
function broadcastState(state) {
  sessionStates.set(state.sessionId, state);
  mainWindow?.webContents.send(platformIpcChannels.stateChanged, state);
}
function broadcastEvent(event) {
  mainWindow?.webContents.send(platformIpcChannels.event, event);
}
function resolveGuestPreload(preloadEntry) {
  return import_node_path.default.resolve(guestPreloadRoot, preloadEntry);
}
async function requestTranslateService(pathname, init) {
  const response = await fetch(new URL(pathname, translateServiceBaseUrl), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    throw new Error(`Translate service failed: ${response.status}`);
  }
  return await response.json();
}
function normalizeLanguageResponse(payload) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}
function normalizeTranslateResponse(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const response = payload;
  if (response.code === 200 && typeof response.data === "string") {
    return response.data;
  }
  if (typeof response.data === "string") {
    return response.data;
  }
  return null;
}
function ensureMainWindow() {
  if (mainWindow) {
    return mainWindow;
  }
  mainWindow = new import_electron.BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 840,
    backgroundColor: "#f1f5f9",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else if ((0, import_node_fs.existsSync)(rendererDistPath)) {
    void mainWindow.loadFile(rendererDistPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
function detachView(sessionId) {
  const view = sessionViews.get(sessionId);
  if (!view || !mainWindow) {
    return;
  }
  try {
    mainWindow.contentView.removeChildView(view);
  } catch {
  }
}
function destroyView(sessionId) {
  const view = sessionViews.get(sessionId);
  if (!view) {
    return;
  }
  detachView(sessionId);
  webContentsToSessionId.delete(view.webContents.id);
  sessionViews.delete(sessionId);
  view.webContents.close();
}
function updateGuestBounds(sessionId) {
  const bounds = sessionBounds.get(sessionId);
  const view = sessionViews.get(sessionId);
  if (!bounds || !view) {
    return;
  }
  if (!bounds.visible || bounds.width <= 0 || bounds.height <= 0) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  view.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  });
}
function enforceAllowedUrl(sessionId, url) {
  const record = sessionRecords.get(sessionId);
  if (!record) {
    return false;
  }
  const adapter = getPlatformAdapter(record.platformId);
  return adapter?.isUrlAllowed(url) ?? false;
}
function createGuestView(record) {
  const adapter = getPlatformAdapter(record.platformId);
  if (!adapter) {
    throw new Error(`Platform adapter not implemented: ${record.platformId}`);
  }
  const guestSession = import_electron.session.fromPartition(record.partition, { cache: true });
  const view = new import_electron.WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      preload: resolveGuestPreload(adapter.preloadEntry),
      partition: record.partition,
      session: guestSession
    }
  });
  if (devServerUrl) {
    view.webContents.openDevTools({ mode: "detach" });
  }
  webContentsToSessionId.set(view.webContents.id, record.id);
  view.webContents.on("will-navigate", (event, url) => {
    if (!enforceAllowedUrl(record.id, url)) {
      event.preventDefault();
    }
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!enforceAllowedUrl(record.id, url)) {
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  view.webContents.on("did-start-loading", () => {
    broadcastState(buildState(record, {
      loginState: "loading",
      containerState: record.id === activeSessionId ? "attached" : "hidden",
      activeUrl: view.webContents.getURL() || record.entryUrl
    }));
  });
  view.webContents.on("did-navigate", (_event, url) => {
    const previous = sessionStates.get(record.id);
    broadcastState(buildState(record, {
      loginState: previous?.loginState ?? "loading",
      containerState: record.id === activeSessionId ? "attached" : "hidden",
      captureState: previous?.captureState ?? "idle",
      activeUrl: url
    }));
  });
  view.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const levelLabel = ["debug", "info", "warn", "error"][level] ?? `level-${level}`;
    console.log(`[guest:${record.platformId}:${record.id}:${levelLabel}] ${message} (${sourceId}:${line})`);
  });
  return view;
}
function attachSession(record) {
  const windowRef = ensureMainWindow();
  let view = sessionViews.get(record.id);
  if (!view) {
    view = createGuestView(record);
    sessionViews.set(record.id, view);
  }
  if (activeSessionId && activeSessionId !== record.id) {
    detachView(activeSessionId);
    const previous = sessionRecords.get(activeSessionId);
    if (previous) {
      broadcastState(buildState(previous, {
        ...sessionStates.get(previous.id),
        containerState: "hidden"
      }));
    }
  }
  activeSessionId = record.id;
  windowRef.contentView.addChildView(view);
  updateGuestBounds(record.id);
  const state = buildState(record, {
    ...sessionStates.get(record.id),
    containerState: "attached"
  });
  broadcastState(state);
  if (!view.webContents.getURL()) {
    void view.webContents.loadURL(record.entryUrl);
  }
  return state;
}
function createSessionRuntime(record) {
  sessionRecords.set(record.id, record);
  const state = buildState(record);
  sessionStates.set(record.id, state);
  return state;
}
async function bootstrap() {
  await import_electron.app.whenReady();
  ensureMainWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      ensureMainWindow();
    }
  });
}
import_electron.ipcMain.handle(platformIpcChannels.createSession, (_event, sessionRecord) => {
  return createSessionRuntime(sessionRecord);
});
import_electron.ipcMain.handle(platformIpcChannels.openSession, (_event, sessionId) => {
  const record = sessionRecords.get(sessionId);
  if (!record) {
    return null;
  }
  return attachSession(record);
});
import_electron.ipcMain.handle(platformIpcChannels.closeSession, (_event, sessionId) => {
  const record = sessionRecords.get(sessionId);
  if (!record) {
    return null;
  }
  detachView(sessionId);
  if (activeSessionId === sessionId) {
    activeSessionId = null;
  }
  const state = buildState(record, {
    ...sessionStates.get(sessionId),
    containerState: "hidden"
  });
  broadcastState(state);
  return state;
});
import_electron.ipcMain.handle(platformIpcChannels.destroySession, (_event, sessionId) => {
  const record = sessionRecords.get(sessionId);
  if (record) {
    destroyView(sessionId);
    sessionRecords.delete(sessionId);
    sessionStates.delete(sessionId);
    sessionBounds.delete(sessionId);
    if (activeSessionId === sessionId) {
      activeSessionId = null;
    }
  }
});
import_electron.ipcMain.handle(platformIpcChannels.setBounds, (_event, bounds) => {
  sessionBounds.set(bounds.sessionId, bounds);
  updateGuestBounds(bounds.sessionId);
});
import_electron.ipcMain.handle(platformIpcChannels.getSessionState, (_event, sessionId) => {
  return sessionStates.get(sessionId) ?? null;
});
import_electron.ipcMain.handle(platformIpcChannels.languageList, async () => {
  try {
    const payload = await requestTranslateService("/api/languageList/languageList");
    return normalizeLanguageResponse(payload);
  } catch (error) {
    console.error("[platform:language-list]", error);
    return [];
  }
});
import_electron.ipcMain.handle(platformIpcChannels.translateText, async (_event, args) => {
  try {
    const payload = await requestTranslateService("/api/translate", {
      method: "POST",
      body: JSON.stringify({
        fromLang: args.local,
        targetLang: args.target,
        text: args.text
      })
    });
    return normalizeTranslateResponse(payload);
  } catch (error) {
    console.error("[platform:translate-text]", error);
    return null;
  }
});
import_electron.ipcMain.on(platformIpcChannels.guestEvent, (event, rawPayload) => {
  const sessionId = webContentsToSessionId.get(event.sender.id);
  if (!sessionId) {
    return;
  }
  const record = sessionRecords.get(sessionId);
  if (!record) {
    return;
  }
  const adapter = getPlatformAdapter(record.platformId);
  if (!adapter) {
    return;
  }
  const payload = adapter.normalizeEvent({
    ...rawPayload,
    sessionId
  });
  broadcastEvent(payload);
});
import_electron.ipcMain.on(platformIpcChannels.guestStateChanged, (event, partial) => {
  const sessionId = webContentsToSessionId.get(event.sender.id);
  if (!sessionId) {
    return;
  }
  const record = sessionRecords.get(sessionId);
  if (!record) {
    return;
  }
  const previous = sessionStates.get(sessionId);
  broadcastState(buildState(record, {
    ...previous,
    ...partial
  }));
});
import_electron.ipcMain.on(platformIpcChannels.guestLog, (event, payload) => {
  const sessionId = webContentsToSessionId.get(event.sender.id) ?? "unknown";
  console.log(`[guest-log:${sessionId}]`, payload);
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
void bootstrap();
//# sourceMappingURL=main.cjs.map
