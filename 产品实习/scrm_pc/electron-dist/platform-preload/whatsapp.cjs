// electron/platform-preload/multi-platform-capture.ts
function normalizePlatformText(text) {
  return text?.replace(/\s+/g, " ").trim() || "";
}
function shouldSkipTranslation(text) {
  return normalizePlatformText(text).length === 0;
}
function buildPlatformMessageKey(input) {
  return `${input.direction}:${input.conversationKey}:${input.timestamp}:${normalizePlatformText(input.text)}`;
}
function splitOutgoingLines(text) {
  return (text ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
}
function extractEditableText(root) {
  if (!root) {
    return "";
  }
  const parts = [];
  const children = Array.from(root.childNodes ?? []);
  if (children.length === 0) {
    return root.textContent ?? "";
  }
  for (const node of children) {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "");
      continue;
    }
    const element = node;
    const tagName = element.tagName?.toUpperCase() ?? "";
    if (tagName === "BR") {
      parts.push("\n");
      continue;
    }
    if (tagName === "IMG" && element.classList?.contains("emoji")) {
      parts.push(element.alt ?? "");
      continue;
    }
    if (element.childNodes && Array.from(element.childNodes).length > 0) {
      parts.push(extractEditableText(element));
      continue;
    }
    parts.push(element.textContent ?? "");
  }
  return parts.join("");
}
function createTranslationNode(text) {
  const translation = document.createElement("div");
  translation.className = "custom-translate-node";
  translation.textContent = text;
  return translation;
}
function createLoadingNode() {
  const loadingNode = document.createElement("div");
  loadingNode.className = "nexscrm-translation-loading";
  loadingNode.setAttribute("data-nexscrm-loading", "true");
  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement("span");
    dot.className = "nexscrm-translation-loading__dot";
    dot.style.animationDelay = `${index * 0.2}s`;
    loadingNode.appendChild(dot);
  }
  return loadingNode;
}
function ensureTranslationStyles() {
  if (document.getElementById("nexscrm-translation-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "nexscrm-translation-style";
  style.textContent = `
    .custom-translate-node {
      display: block;
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1px dashed #cbd5e1;
      color: #2563eb;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .nexscrm-translation-loading {
      display: flex;
      gap: 4px;
      padding-top: 5px;
      margin-top: 5px;
    }
    .nexscrm-translation-loading__dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #2563eb;
      animation: nexscrm-wave 1.2s ease-in-out infinite;
    }
    @keyframes nexscrm-wave {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.45); opacity: 1; }
    }
    @media (prefers-color-scheme: dark) {
      .custom-translate-node {
        color: #93c5fd;
        border-top-color: #475569;
      }
      .nexscrm-translation-loading__dot {
        background: #93c5fd;
      }
    }
  `;
  document.head.appendChild(style);
}
function appendNode(parent, node) {
  if (!parent) {
    return false;
  }
  parent.appendChild(node);
  return true;
}
function removeNode(node) {
  node?.remove();
}

// electron/platform-preload/multi-platform-runtime.ts
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

// electron/platform-preload/multi-platform-runtime.ts
function emitPlatformState(payload) {
  import_electron.ipcRenderer.send(platformIpcChannels.guestStateChanged, payload);
}
function emitPlatformEvent(event) {
  import_electron.ipcRenderer.send(platformIpcChannels.guestEvent, event);
}
function logPlatformGuest(payload) {
  import_electron.ipcRenderer.send(platformIpcChannels.guestLog, payload);
}
async function translatePlatformText(input) {
  return import_electron.ipcRenderer.invoke(platformIpcChannels.translateText, input);
}
async function getPlatformLanguageList() {
  return import_electron.ipcRenderer.invoke(platformIpcChannels.languageList);
}
async function openTranslationCache(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("messages")) {
        const store = db.createObjectStore("messages", { keyPath: ["originalText", "language"] });
        store.createIndex("originalText", "originalText", { unique: false });
        store.createIndex("language", "language", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getCachedTranslation(dbName, originalText, language) {
  const db = await openTranslationCache(dbName);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    const request = store.get([originalText, language]);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function saveCachedTranslation(dbName, originalText, translatedText, language) {
  const db = await openTranslationCache(dbName);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");
    const request = store.put({ originalText, translatedText, language });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// electron/platform-preload/web-chat-preload.ts
var languages = [];
var seenMessages = /* @__PURE__ */ new Set();
var translatedElements = /* @__PURE__ */ new WeakSet();
function getStoredLanguage(key, fallback) {
  return localStorage.getItem(key) || fallback;
}
function setStoredLanguage(key, value) {
  localStorage.setItem(key, value);
}
function getConversationKey(config) {
  const selectorText = config.conversationSelector ? normalizePlatformText(document.querySelector(config.conversationSelector)?.textContent) : "";
  return selectorText || window.location.hash || document.title || "unknown";
}
function detectDirection(element) {
  const className = element.className || "";
  const dir = element.getAttribute("data-message-author") || element.getAttribute("data-testid") || "";
  if (/out|own|sent|message-out|is-out|is-sent/i.test(`${className} ${dir}`)) {
    return "outgoing";
  }
  return "incoming";
}
function detectLoginState(config) {
  if (config.loginSelectors.some((selector) => document.querySelector(selector))) {
    return "logged_in";
  }
  if (config.qrSelectors.some((selector) => document.querySelector(selector))) {
    return "qr_required";
  }
  if (document.readyState !== "complete") {
    return "loading";
  }
  return "idle";
}
function defaultCollectMessages(config) {
  return Array.from(document.querySelectorAll(config.messageSelector)).map((element) => {
    const textElement = config.messageTextSelector ? element.querySelector(config.messageTextSelector) : element;
    const text = normalizePlatformText(textElement?.textContent);
    return {
      element: textElement ?? element,
      text,
      direction: detectDirection(element),
      conversationKey: getConversationKey(config)
    };
  }).filter((candidate) => candidate.text.length > 0);
}
function emitCapturedMessage(config, candidate, direction) {
  const timestamp = Date.now();
  const conversationKey = candidate.conversationKey || getConversationKey(config);
  const messageDirection = direction || candidate.direction || detectDirection(candidate.element);
  const key = buildPlatformMessageKey({
    direction: messageDirection,
    conversationKey,
    timestamp,
    text: candidate.text
  });
  if (seenMessages.has(`${messageDirection}:${conversationKey}:${candidate.text}`)) {
    return;
  }
  seenMessages.add(`${messageDirection}:${conversationKey}:${candidate.text}`);
  emitPlatformEvent({
    sessionId: "",
    direction: messageDirection,
    conversationKey,
    messageKey: key,
    text: candidate.text,
    timestamp,
    rawMeta: candidate.rawMeta ?? {}
  });
}
async function translateWithCache(config, text, targetLanguage) {
  const cached = await getCachedTranslation(config.cacheDbName, text, targetLanguage);
  if (cached?.translatedText) {
    return cached.translatedText;
  }
  const translatedText = await translatePlatformText({
    text,
    local: getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal),
    target: targetLanguage
  });
  if (!translatedText) {
    return null;
  }
  await saveCachedTranslation(config.cacheDbName, text, translatedText, targetLanguage);
  return translatedText;
}
async function translateIncomingCandidate(config, candidate) {
  const text = candidate.text;
  const targetLanguage = getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal);
  if (translatedElements.has(candidate.element) || shouldSkipTranslation(text)) {
    return;
  }
  translatedElements.add(candidate.element);
  candidate.element.setAttribute("data-translate-status", "processing");
  ensureTranslationStyles();
  const loadingNode = createLoadingNode();
  appendNode(candidate.element, loadingNode);
  try {
    const translatedText = await translateWithCache(config, text, targetLanguage);
    removeNode(loadingNode);
    if (!translatedText) {
      candidate.element.setAttribute("data-translate-status", "failed");
      return;
    }
    candidate.element.setAttribute("data-translate-status", "Translated");
    candidate.element.setAttribute("data-language-type", targetLanguage);
    appendNode(candidate.element, createTranslationNode(translatedText));
  } catch (error) {
    removeNode(loadingNode);
    candidate.element.setAttribute("data-translate-status", "failed");
    logPlatformGuest({
      tag: `${config.platformId}-incoming-translate-error`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
async function processMessageList(config) {
  const candidates = config.collectMessages?.() ?? defaultCollectMessages(config);
  if (candidates.length === 0) {
    return;
  }
  emitPlatformState({
    loginState: "logged_in",
    captureState: "observing",
    activeUrl: window.location.href
  });
  for (const candidate of candidates) {
    emitCapturedMessage(config, candidate);
    if (candidate.direction !== "outgoing") {
      void translateIncomingCandidate(config, candidate);
    }
  }
}
function readDefaultDraft(input) {
  return extractEditableText(input) || input.innerText || input.textContent || "";
}
function writeDefaultDraft(input, translatedText) {
  input.textContent = translatedText;
  input.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    cancelable: true,
    data: translatedText,
    inputType: "insertText"
  }));
}
async function handleSend(config, event, input) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey) {
    return;
  }
  if (config.shouldBypassSendTranslation?.(input)) {
    return;
  }
  const existingLoading = document.getElementById("editDivLoadingNode");
  if (existingLoading) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  const originalText = config.readDraft?.(input) ?? readDefaultDraft(input);
  const lines = splitOutgoingLines(originalText);
  if (lines.length === 0) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  ensureTranslationStyles();
  const loadingNode = createLoadingNode();
  loadingNode.id = "editDivLoadingNode";
  appendNode(input.parentElement, loadingNode);
  try {
    const targetLanguage = getStoredLanguage(config.languageStorage.target, config.languageStorage.defaultTarget);
    const translatedLines = await Promise.all(lines.map((line) => translateWithCache(config, line, targetLanguage)));
    if (translatedLines.some((line) => !line)) {
      removeNode(loadingNode);
      return;
    }
    const translatedText = translatedLines.filter(Boolean).join("\n");
    emitCapturedMessage(config, {
      element: input,
      text: originalText,
      direction: "outgoing",
      conversationKey: getConversationKey(config),
      rawMeta: { translatedText }
    }, "outgoing");
    (config.writeDraft ?? writeDefaultDraft)(input, translatedText);
    removeNode(loadingNode);
    window.setTimeout(() => {
      const trigger = document.querySelector(config.sendButtonSelector);
      const button = trigger?.closest('button, [role="button"]') ?? trigger;
      button?.click();
    }, 0);
  } catch (error) {
    removeNode(loadingNode);
    logPlatformGuest({
      tag: `${config.platformId}-send-translate-error`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
function bindSendInterceptor(config) {
  const input = document.querySelector(config.inputSelector);
  if (!input || input.dataset.nexscrmSendBound === "true") {
    return;
  }
  input.dataset.nexscrmSendBound = "true";
  input.addEventListener("keydown", (event) => {
    void handleSend(config, event, input);
  }, true);
}
function addLanguageControl(config) {
  if (!config.toolbarAnchorSelector || document.getElementById("customLanguageNode") || languages.length === 0) {
    return;
  }
  const anchor = document.querySelector(config.toolbarAnchorSelector);
  if (!anchor?.parentElement) {
    return;
  }
  ensureTranslationStyles();
  const button = document.createElement("button");
  button.id = "customLanguageNode";
  button.type = "button";
  button.className = "translate-btn";
  button.textContent = "\u8BD1";
  button.style.cssText = "border:none;background:transparent;cursor:pointer;font-size:16px;padding:4px;color:#2563eb;";
  const popup = document.createElement("div");
  popup.className = "select-box-popup";
  popup.style.cssText = "position:absolute;display:none;z-index:10000;width:200px;padding:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.12);";
  const localBox = document.createElement("div");
  const targetBox = document.createElement("div");
  const refreshLabels = () => {
    localBox.textContent = `Local: ${getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal)}`;
    targetBox.textContent = `Target: ${getStoredLanguage(config.languageStorage.target, config.languageStorage.defaultTarget)}`;
  };
  refreshLabels();
  for (const box of [localBox, targetBox]) {
    box.style.cssText = "padding:8px;border:1px solid #e2e8f0;margin-bottom:8px;cursor:pointer;";
    popup.appendChild(box);
  }
  function showLanguageList(storageKey, fallback) {
    const list = document.createElement("div");
    list.style.cssText = "position:absolute;z-index:10001;max-height:180px;overflow:auto;background:#fff;border:1px solid #cbd5e1;color:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.12);";
    const rect = popup.getBoundingClientRect();
    list.style.top = `${rect.top}px`;
    list.style.left = `${rect.right + 4}px`;
    languages.forEach((language) => {
      const option = document.createElement("div");
      option.textContent = language.displayName || language.code;
      option.style.cssText = "padding:8px 12px;cursor:pointer;";
      option.addEventListener("click", () => {
        setStoredLanguage(storageKey, language.code || fallback);
        document.querySelectorAll(".custom-translate-node").forEach((node) => node.remove());
        document.querySelectorAll("[data-translate-status]").forEach((node) => node.removeAttribute("data-translate-status"));
        list.remove();
        refreshLabels();
      });
      list.appendChild(option);
    });
    document.body.appendChild(list);
  }
  localBox.addEventListener("click", (event) => {
    event.stopPropagation();
    showLanguageList(config.languageStorage.local, config.languageStorage.defaultLocal);
  });
  targetBox.addEventListener("click", (event) => {
    event.stopPropagation();
    showLanguageList(config.languageStorage.target, config.languageStorage.defaultTarget);
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const rect = button.getBoundingClientRect();
    popup.style.display = popup.style.display === "none" ? "block" : "none";
    popup.style.top = `${rect.top - 96}px`;
    popup.style.left = `${rect.left}px`;
  });
  document.addEventListener("click", () => {
    popup.style.display = "none";
  });
  anchor.parentElement.insertBefore(button, anchor.nextSibling);
  document.body.appendChild(popup);
}
function checkUnread(config) {
  if (!config.unreadSelector) {
    return;
  }
  const unread = document.querySelector(config.unreadSelector);
  if (unread && document.visibilityState !== "visible") {
    logPlatformGuest({ tag: `${config.platformId}-unread`, text: normalizePlatformText(unread.textContent) });
  }
}
async function initializeLanguages() {
  try {
    languages = await getPlatformLanguageList();
  } catch {
    languages = [];
  }
}
function startWebChatPreload(config) {
  ensureTranslationStyles();
  void initializeLanguages();
  const tick = () => {
    emitPlatformState({
      loginState: detectLoginState(config),
      captureState: document.querySelector(config.messageContainerSelector) ? "observing" : "selector_missing",
      activeUrl: window.location.href
    });
    bindSendInterceptor(config);
    addLanguageControl(config);
    checkUnread(config);
    void processMessageList(config);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick, { once: true });
  } else {
    tick();
  }
  const observerTarget = document.documentElement || document.body;
  const observer = new MutationObserver(() => tick());
  observer.observe(observerTarget, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-selected"] });
  window.setInterval(tick, 1500);
}

// electron/platform-preload/whatsapp.ts
startWebChatPreload({
  platformId: "whatsapp",
  loginSelectors: [
    'footer div[contenteditable="true"]',
    'div[role="application"]',
    "#pane-side"
  ],
  qrSelectors: ["canvas", "div[data-ref]"],
  messageSelector: "span[dir] > span:not([data-translate-status])",
  messageContainerSelector: 'div[role="application"]',
  inputSelector: 'footer div[contenteditable="true"]',
  sendButtonSelector: 'footer span[data-icon="send"]',
  conversationSelector: '#main header span[title], #main header [dir="auto"]',
  unreadSelector: '#pane-side [aria-label*="unread"], #pane-side [data-testid*="unread"]',
  toolbarAnchorSelector: 'footer button, footer [role="button"]',
  languageStorage: {
    local: "localLanguage",
    target: "targetLanguage",
    defaultLocal: "zh",
    defaultTarget: "en"
  },
  cacheDbName: "TranslationDB",
  collectMessages() {
    return Array.from(document.querySelectorAll("span[dir] > span:not([data-translate-status])")).filter((element) => Boolean(element.closest('div[role="application"]'))).map((element) => ({
      element,
      text: element.textContent?.trim() || "",
      direction: "incoming"
    })).filter((candidate) => candidate.text.length > 0);
  },
  shouldBypassSendTranslation(input) {
    return Boolean(input.querySelector("span") && input.querySelectorAll('span.selectable-text.copyable-text[data-lexical-text="true"]').length === 0);
  }
});
//# sourceMappingURL=whatsapp.cjs.map
