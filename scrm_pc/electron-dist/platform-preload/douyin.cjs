// electron/platform-preload/douyin.ts
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
  guestLog: "platform:guest-log"
};

// electron/platform-preload/douyin-capture.ts
var douyinConversationRootSelector = '[data-mask="conversaton-detail-content"]';
var douyinMessageContentSelector = "#messageContent";
var douyinMessageItemSelector = '[data-e2e="msg-item-content"]';
var douyinTranslationMarker = "data-nexscrm-translation";
var douyinComposerRootSelector = '[data-e2e="msg-input"]';
var douyinComposerContentsSelector = '[data-contents="true"]';
var douyinComposerSelector = 'span[data-text="true"]';
var douyinComposerEditableSelector = '[contenteditable]:not([contenteditable="false"])';
var douyinTranslatedOutgoingText = "this is message of test\u3002";
function isDouyinMessageTextClass(className) {
  return /(^|\s)TextMessageTextpureText(\s|$)|TextMessageText/i.test(className);
}
function hasDouyinConversationWindow(root) {
  return Boolean(root.querySelector(douyinConversationRootSelector));
}
function isDouyinDocumentInspectable(documentLike) {
  const readyState = documentLike.readyState || "";
  const hasStructure = Boolean(documentLike.body || documentLike.documentElement);
  return hasStructure && readyState !== "loading";
}
function resolveDouyinObservationTarget(documentLike) {
  return documentLike.documentElement ?? documentLike;
}
function queryDouyinMessageNodes(root) {
  const conversationRoot = root.querySelector(douyinConversationRootSelector);
  if (!conversationRoot?.querySelector) {
    return [];
  }
  const messageContent = conversationRoot.querySelector(douyinMessageContentSelector);
  if (!messageContent?.querySelectorAll) {
    return [];
  }
  return Array.from(messageContent.querySelectorAll(douyinMessageItemSelector) ?? []);
}
function queryDouyinMessageItemNodes(root) {
  const nodes = Array.from(root.querySelectorAll(douyinMessageItemSelector) ?? []);
  return nodes.filter((node, index) => {
    return !nodes.some((candidate, candidateIndex) => {
      if (candidateIndex === index || candidate === node) {
        return false;
      }
      return typeof candidate.contains === "function" && candidate.contains?.(node);
    });
  });
}
function normalizeText(text) {
  return text?.replace(/\s+/g, " ").trim() || "";
}
function normalizeDouyinCapturedText(text) {
  return normalizeText(text).replace(/点赞回复删除$/, "").trim();
}
function extractDouyinComposerText(root) {
  const composerRoot = root.querySelector(douyinComposerRootSelector);
  const candidates = [
    composerRoot?.querySelector?.(douyinComposerSelector),
    root.querySelector(douyinComposerSelector),
    composerRoot?.querySelector?.(douyinComposerContentsSelector),
    root.querySelector(douyinComposerContentsSelector),
    composerRoot?.querySelector?.(douyinComposerEditableSelector),
    root.querySelector(douyinComposerEditableSelector)
  ];
  for (const candidate of candidates) {
    const text = normalizeDouyinCapturedText(candidate?.textContent);
    if (text) {
      return text;
    }
  }
  return "";
}
function buildDouyinTranslatedOutgoingText(_text) {
  return douyinTranslatedOutgoingText;
}
function isDouyinComposerEventTarget(target) {
  if (!target) {
    return false;
  }
  if (target.closest?.(douyinComposerSelector) || target.closest?.(douyinComposerContentsSelector) || target.closest?.(douyinComposerRootSelector)) {
    return true;
  }
  const editableHost = target.closest?.(douyinComposerEditableSelector);
  if (editableHost?.querySelector?.(douyinComposerSelector)) {
    return true;
  }
  return Boolean(target.querySelector?.(douyinComposerSelector));
}
function isDouyinComposerTextEditTarget(target) {
  if (!target) {
    return false;
  }
  if (target.closest?.(douyinComposerSelector) || target.closest?.(douyinComposerContentsSelector) || target.closest?.(douyinComposerEditableSelector)) {
    return true;
  }
  return Boolean(
    target.querySelector?.(douyinComposerSelector) || target.querySelector?.(douyinComposerContentsSelector) || target.querySelector?.(douyinComposerEditableSelector)
  );
}
function isDouyinSendButtonTarget(target) {
  const button = target?.closest?.('button, [role="button"]') ?? null;
  const buttonText = normalizeText(button?.textContent);
  return buttonText.includes("\u53D1\u9001");
}
function shouldSuppressDouyinOutgoingEcho(pending, candidate) {
  if (!pending) {
    return false;
  }
  return pending.expiresAt >= candidate.now && pending.translatedText === candidate.text && pending.conversationKey === candidate.conversationKey;
}
function summarizeDebugNode(node) {
  if (!node) {
    return null;
  }
  return {
    tagName: node.tagName || "",
    id: node.id || "",
    className: typeof node.className === "string" ? node.className : "",
    text: normalizeText(node.textContent).slice(0, 120)
  };
}
function summarizeProbeNode(node) {
  return {
    tagName: node.tagName || "",
    id: node.id || "",
    className: typeof node.className === "string" ? node.className : "",
    text: normalizeText(node.textContent).slice(0, 120),
    dataE2e: node.getAttribute?.("data-e2e") || "",
    dataMask: node.getAttribute?.("data-mask") || ""
  };
}
function getOuterHtmlPreview(node) {
  return node?.outerHTML?.replace(/\s+/g, " ").trim().slice(0, 240) || "";
}
function collectDouyinMessageItemDomPreview(root) {
  return queryDouyinMessageItemNodes(root).slice(0, 10).map((node) => ({
    tagName: node.tagName || "",
    id: node.id || "",
    className: typeof node.className === "string" ? node.className : "",
    text: normalizeDouyinCapturedText(node.textContent).slice(0, 120),
    outerHTML: getOuterHtmlPreview(node)
  }));
}
function collectDouyinDebugSnapshot(root) {
  const conversationRoot = root.querySelector(douyinConversationRootSelector);
  const messageContent = conversationRoot?.querySelector?.(douyinMessageContentSelector) ?? null;
  const messageItems = queryDouyinMessageNodes(root);
  return {
    hasConversationRoot: Boolean(conversationRoot),
    hasMessageContent: Boolean(messageContent),
    messageCount: messageItems.length,
    conversationRoot: summarizeDebugNode(conversationRoot),
    messageContent: summarizeDebugNode(messageContent),
    messageItems: messageItems.slice(0, 5).map((node) => summarizeDebugNode(node))
  };
}
function collectDouyinPageProbe(root) {
  const allNodes = Array.from(root.querySelectorAll("*") ?? []);
  const seenKeys = /* @__PURE__ */ new Set();
  return allNodes.filter((node) => {
    const className = typeof node.className === "string" ? node.className : "";
    const id = node.id || "";
    const dataE2e = node.getAttribute?.("data-e2e") || "";
    const dataMask = node.getAttribute?.("data-mask") || "";
    const text = normalizeText(node.textContent);
    return Boolean(
      isDouyinMessageTextClass(className) || /message|conversation|chat|msg/i.test(className) || /message|conversation|chat|msg/i.test(id) || /message|conversation|chat|msg/i.test(dataE2e) || /conversation|message/i.test(dataMask) || text.length > 0 && text.length <= 80 && /会话|消息|聊天/.test(text)
    );
  }).map((node) => summarizeProbeNode(node)).filter((node) => {
    const signature = `${node.tagName}|${node.id}|${node.className}|${node.dataE2e}|${node.dataMask}|${node.text}`;
    if (seenKeys.has(signature)) {
      return false;
    }
    seenKeys.add(signature);
    return true;
  }).slice(0, 20);
}
function collectDouyinDocumentSkeleton(documentLike) {
  const htmlNode = documentLike.documentElement ?? null;
  const bodyNode = documentLike.body ?? null;
  const bodyChildren = Array.from(bodyNode?.children ?? []).slice(0, 10);
  return {
    readyState: documentLike.readyState || "",
    title: documentLike.title || "",
    href: documentLike.location?.href || "",
    documentText: normalizeText(bodyNode?.textContent ?? htmlNode?.textContent ?? "").slice(0, 240),
    html: summarizeDebugNode(htmlNode),
    body: summarizeDebugNode(bodyNode),
    bodyChildren: bodyChildren.map((node) => summarizeDebugNode(node)),
    htmlPreview: getOuterHtmlPreview(htmlNode),
    bodyPreview: getOuterHtmlPreview(bodyNode)
  };
}
function detectDouyinMessageDirection(left, viewportWidth) {
  return left > viewportWidth / 2 ? "outgoing" : "incoming";
}
function buildDouyinMessageSignature(text, direction, index) {
  return `${direction}|${index}|${text.trim()}`;
}
function shouldBlockDouyinProtocolUrl(url) {
  try {
    const parsed = new URL(url);
    return !["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// electron/platform-preload/douyin.ts
var seenMessageKeys = /* @__PURE__ */ new Set();
var currentLoginState = "idle";
var lastDebugSignature = "";
var lastMessageDomSignature = "";
var lastReadyState = "";
var lastDraftSignature = "";
var lastDraftTimestamp = 0;
var isReplayingSend = false;
var pendingTranslatedOutgoing = null;
var lastComposerDraft = null;
function isDownloadPage() {
  return window.location.host === "imdesktop.douyin.com";
}
function emitState(payload) {
  import_electron.ipcRenderer.send(platformIpcChannels.guestStateChanged, payload);
}
function sendGuestLog(payload) {
  import_electron.ipcRenderer.send(platformIpcChannels.guestLog, payload);
}
function stableText(node) {
  return node?.textContent?.replace(/\s+/g, " ").trim() || "";
}
function cleanedText(node) {
  return normalizeDouyinCapturedText(node?.textContent);
}
function getConversationRoot() {
  return document.querySelector(douyinConversationRootSelector);
}
function getMessageContent() {
  return getConversationRoot()?.querySelector(douyinMessageContentSelector) ?? null;
}
function getMessageItems() {
  return queryDouyinMessageNodes(document).filter((node) => cleanedText(node).length > 0);
}
function logRawMessageItemDom() {
  const directItems = queryDouyinMessageItemNodes(document);
  if (directItems.length === 0) {
    return;
  }
  const previews = collectDouyinMessageItemDomPreview(document);
  const signature = JSON.stringify(previews);
  if (signature === lastMessageDomSignature) {
    return;
  }
  lastMessageDomSignature = signature;
  console.log("[douyin-msg-item-dom]", {
    count: directItems.length,
    selector: douyinMessageItemSelector,
    items: previews
  });
}
function logReadyStateTransition(reason) {
  const nextReadyState = document.readyState || "unknown";
  if (nextReadyState === lastReadyState && reason !== "force") {
    return;
  }
  lastReadyState = nextReadyState;
  console.log("[douyin-ready-state]", {
    reason,
    readyState: nextReadyState,
    url: window.location.href,
    hasBody: Boolean(document.body),
    hasDocumentElement: Boolean(document.documentElement)
  });
}
function findMessageTextNode(item) {
  const explicitTextNode = item.querySelector(".TextMessageTextpureText");
  if (explicitTextNode && cleanedText(explicitTextNode)) {
    return explicitTextNode;
  }
  const matchingDescendant = Array.from(item.querySelectorAll("*")).find((node) => {
    const className = typeof node.className === "string" ? node.className : "";
    return isDouyinMessageTextClass(className) && cleanedText(node).length > 0;
  });
  if (matchingDescendant) {
    return matchingDescendant;
  }
  const ownClassName = typeof item.className === "string" ? item.className : "";
  if (isDouyinMessageTextClass(ownClassName) && cleanedText(item).length > 0) {
    return item;
  }
  return null;
}
function injectTranslationBubble(item) {
  if (item.querySelector(`[${douyinTranslationMarker}]`)) {
    return;
  }
  const translation = document.createElement("div");
  translation.setAttribute(douyinTranslationMarker, "true");
  translation.textContent = "this is traslation of test.";
  translation.style.marginTop = "8px";
  translation.style.fontSize = "16px";
  translation.style.lineHeight = "1.4";
  translation.style.color = "#10ec73";
  translation.style.opacity = "0.92";
  item.appendChild(translation);
}
function detectLoginState() {
  if (isDownloadPage()) {
    return "idle";
  }
  if (getMessageItems().length > 0) {
    return "logged_in";
  }
  if (document.querySelector('canvas, img[alt*="\u4E8C\u7EF4\u7801"], [class*="qrcode"]')) {
    return "qr_required";
  }
  if (document.readyState !== "complete") {
    return "loading";
  }
  return "idle";
}
function getConversationKey() {
  return stableText(
    document.querySelector('[data-e2e="conversation-active"], [class*="conversation"][class*="active"], [class*="title"]')
  ) || "unknown";
}
function getCurrentComposerRoot(triggerTarget) {
  return triggerTarget?.closest(douyinComposerRootSelector) ?? document.querySelector(douyinComposerRootSelector);
}
function findCurrentComposerElements(triggerTarget) {
  const composerRoot = getCurrentComposerRoot(triggerTarget);
  const composer = composerRoot?.querySelector(douyinComposerSelector) ?? document.querySelector(douyinComposerSelector);
  const contentsHost = composerRoot?.querySelector(douyinComposerContentsSelector) ?? composer?.closest(douyinComposerContentsSelector) ?? null;
  const targetEditable = triggerTarget?.closest(douyinComposerEditableSelector);
  const editableHost = targetEditable && composerRoot?.contains(targetEditable) ? targetEditable : composer?.closest(douyinComposerEditableSelector) ?? composerRoot?.querySelector(douyinComposerEditableSelector) ?? null;
  return {
    composerRoot,
    composer,
    contentsHost,
    editableHost
  };
}
function readComposerDraft(triggerTarget) {
  const text = extractDouyinComposerText(getCurrentComposerRoot(triggerTarget) ?? document);
  if (text) {
    lastComposerDraft = {
      text,
      updatedAt: Date.now()
    };
    return text;
  }
  if (lastComposerDraft && Date.now() - lastComposerDraft.updatedAt < 3e4) {
    return lastComposerDraft.text;
  }
  return "";
}
function refreshComposerDraft(triggerTarget, reason = "unknown") {
  window.setTimeout(() => {
    const text = extractDouyinComposerText(getCurrentComposerRoot(triggerTarget) ?? document);
    if (!text) {
      return;
    }
    lastComposerDraft = {
      text,
      updatedAt: Date.now()
    };
    sendGuestLog({
      tag: "douyin-draft-cache",
      reason,
      text
    });
  }, 0);
}
function dispatchComposerInputEvents(target, translatedText) {
  target.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    data: translatedText,
    inputType: "insertReplacementText"
  }));
  target.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    data: translatedText,
    inputType: "insertReplacementText"
  }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}
function rewriteComposerText(translatedText, triggerTarget) {
  const { composerRoot, composer, contentsHost, editableHost } = findCurrentComposerElements(triggerTarget);
  if (!composer) {
    sendGuestLog({
      tag: "douyin-send-rewrite",
      phase: "missing-composer",
      composerRootSelector: douyinComposerRootSelector,
      composerSelector: douyinComposerSelector
    });
    return false;
  }
  const inputHost = contentsHost || editableHost || composer;
  const focusHost = editableHost || inputHost;
  const beforeText = extractDouyinComposerText(composerRoot ?? document);
  focusHost.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(contentsHost || composer);
  selection?.removeAllRanges();
  selection?.addRange(range);
  dispatchComposerInputEvents(inputHost, translatedText);
  if (focusHost !== inputHost) {
    dispatchComposerInputEvents(focusHost, translatedText);
  }
  let updated = false;
  try {
    updated = document.execCommand("insertText", false, translatedText);
  } catch {
    updated = false;
  }
  if (!updated) {
    composer.textContent = translatedText;
  }
  if (composer.textContent !== translatedText) {
    composer.textContent = translatedText;
  }
  if (contentsHost && contentsHost.textContent !== translatedText) {
    contentsHost.textContent = translatedText;
  }
  dispatchComposerInputEvents(composer, translatedText);
  if (contentsHost && contentsHost !== composer) {
    dispatchComposerInputEvents(contentsHost, translatedText);
  }
  if (inputHost !== composer) {
    dispatchComposerInputEvents(inputHost, translatedText);
  }
  const afterText = extractDouyinComposerText(composerRoot ?? document);
  sendGuestLog({
    tag: "douyin-send-rewrite",
    phase: "rewrite-attempt",
    beforeText,
    afterText,
    translatedText,
    execCommandUpdated: updated,
    composerRootFound: Boolean(composerRoot),
    contentsHostFound: Boolean(contentsHost),
    editableHostFound: Boolean(editableHost),
    contentsHostText: stableText(contentsHost).slice(0, 120),
    inputHostTag: inputHost.tagName,
    inputHostIsDataContents: inputHost.getAttribute("data-contents") ?? "",
    inputHostContentEditable: inputHost.getAttribute("contenteditable") ?? "",
    focusHostTag: focusHost.tagName,
    focusHostContentEditable: focusHost.getAttribute("contenteditable") ?? ""
  });
  return true;
}
function findSendButton(root) {
  return Array.from((root ?? document).querySelectorAll('button, [role="button"]')).find(
    (node) => stableText(node).includes("\u53D1\u9001")
  ) || null;
}
function findSendActionTarget(root) {
  const sendButton = findSendButton(root);
  if (sendButton) {
    return sendButton;
  }
  const scope = root ?? document;
  const iconCandidates = Array.from(scope.querySelectorAll("svg, path, use")).filter((node) => !isDouyinComposerTextEditTarget(node)).map((node) => ({
    node,
    rect: node.getBoundingClientRect()
  })).filter(({ rect }) => rect.width > 0 && rect.height > 0).sort((a, b) => b.rect.right - a.rect.right || b.rect.bottom - a.rect.bottom);
  return iconCandidates[0]?.node ?? null;
}
function replaySend(trigger, composerRoot, translatedText, originalTarget) {
  window.setTimeout(() => {
    const currentText = extractDouyinComposerText(composerRoot ?? document);
    sendGuestLog({
      tag: "douyin-send-replay",
      trigger,
      phase: "replay-original-action",
      currentText,
      translatedText,
      originalTargetTag: originalTarget?.tagName || ""
    });
    isReplayingSend = true;
    try {
      if (trigger.includes("button") && originalTarget) {
        originalTarget.dispatchEvent(new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        return;
      }
      const sendActionTarget = findSendActionTarget(composerRoot);
      if (sendActionTarget) {
        sendGuestLog({
          tag: "douyin-send-replay",
          trigger,
          phase: "click-send-action-target",
          targetTag: sendActionTarget.tagName,
          targetText: stableText(sendActionTarget).slice(0, 120)
        });
        sendActionTarget.dispatchEvent(new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        return;
      }
      const { composer, editableHost } = findCurrentComposerElements(composerRoot ?? void 0);
      const inputHost = editableHost || composer;
      if (inputHost) {
        inputHost.dispatchEvent(new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter"
        }));
      }
    } finally {
      window.setTimeout(() => {
        isReplayingSend = false;
      }, 0);
    }
  }, trigger.includes("button") ? 0 : 16);
}
function emitMessage(event) {
  const messageKey = event.messageKey?.trim() || `${event.direction}:${event.conversationKey ?? "unknown"}:${event.timestamp}:${event.text}`;
  if (seenMessageKeys.has(messageKey)) {
    return;
  }
  seenMessageKeys.add(messageKey);
  console.log("[douyin-capture]", {
    conversationKey: event.conversationKey ?? "unknown",
    direction: event.direction,
    messageKey,
    text: event.text,
    timestamp: event.timestamp,
    rawMeta: event.rawMeta ?? {}
  });
  import_electron.ipcRenderer.send(platformIpcChannels.guestEvent, {
    ...event,
    messageKey
  });
}
function emitDraftComposerMessage(trigger, triggerTarget) {
  const composerRoot = getCurrentComposerRoot(triggerTarget);
  const text = readComposerDraft(triggerTarget);
  if (!text) {
    sendGuestLog({
      tag: "douyin-send-intercept",
      trigger,
      phase: "skip-empty-draft",
      conversationKey: getConversationKey(),
      composerRootFound: Boolean(composerRoot),
      cachedDraftAge: lastComposerDraft ? Date.now() - lastComposerDraft.updatedAt : null
    });
    return;
  }
  const now = Date.now();
  const signature = `${trigger}|${getConversationKey()}|${text}`;
  if (signature === lastDraftSignature && now - lastDraftTimestamp < 1200) {
    sendGuestLog({
      tag: "douyin-send-intercept",
      trigger,
      phase: "skip-duplicate-draft",
      conversationKey: getConversationKey(),
      text
    });
    return;
  }
  lastDraftSignature = signature;
  lastDraftTimestamp = now;
  emitMessage({
    sessionId: "",
    direction: "outgoing",
    conversationKey: getConversationKey(),
    messageKey: `draft:${signature}:${now}`,
    text,
    timestamp: now,
    rawMeta: {
      phase: "draft",
      trigger,
      composerSelector: douyinComposerSelector,
      composerRootSelector: douyinComposerRootSelector
    }
  });
  const translatedText = buildDouyinTranslatedOutgoingText(text);
  sendGuestLog({
    tag: "douyin-send-intercept",
    trigger,
    phase: "captured-draft",
    conversationKey: getConversationKey(),
    originalText: text,
    translatedText,
    composerRootFound: Boolean(composerRoot)
  });
  if (rewriteComposerText(translatedText, triggerTarget)) {
    pendingTranslatedOutgoing = {
      translatedText,
      conversationKey: getConversationKey(),
      expiresAt: now + 5e3
    };
    sendGuestLog({
      tag: "douyin-send-rewrite",
      trigger,
      originalText: text,
      translatedText
    });
    replaySend(trigger, composerRoot, translatedText, triggerTarget);
  }
}
function emitDebugSnapshot(reason) {
  const snapshot = collectDouyinDebugSnapshot(document);
  const pageProbe = snapshot.hasConversationRoot ? [] : collectDouyinPageProbe(document);
  const documentSkeleton = pageProbe.length === 0 ? collectDouyinDocumentSkeleton(document) : null;
  const signature = JSON.stringify({
    reason,
    url: window.location.href,
    hasConversationRoot: snapshot.hasConversationRoot,
    hasMessageContent: snapshot.hasMessageContent,
    messageCount: snapshot.messageCount,
    items: snapshot.messageItems,
    probe: pageProbe,
    skeleton: documentSkeleton
  });
  if (signature === lastDebugSignature) {
    return;
  }
  lastDebugSignature = signature;
  console.log("[douyin-dom-snapshot]", {
    reason,
    url: window.location.href,
    ...snapshot,
    pageProbe,
    documentSkeleton
  });
}
function bindProtocolBlocker() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }
    const href = anchor.href;
    if (!href || !shouldBlockDouyinProtocolUrl(href)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    emitState({
      activeUrl: window.location.href,
      lastError: `\u5DF2\u62E6\u622A\u5916\u90E8\u534F\u8BAE\u8DF3\u8F6C: ${href}`
    });
  }, true);
}
function isEnterSendEvent(event) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}
function isBeforeInputSendEvent(event) {
  return event.inputType === "insertParagraph" || event.inputType === "insertLineBreak";
}
function logComposerKeyboardProbe(tag, event, target) {
  const composerRoot = getCurrentComposerRoot(target);
  const contentsHost = composerRoot?.querySelector(douyinComposerContentsSelector) ?? null;
  const isComposerTarget = isDouyinComposerEventTarget(target);
  sendGuestLog({
    tag,
    key: event.key,
    code: event.code,
    shiftKey: event.shiftKey,
    isComposing: event.isComposing,
    targetTag: target.tagName,
    targetText: stableText(target).slice(0, 120),
    hasMsgInputAncestor: Boolean(target.closest(douyinComposerRootSelector)),
    hasComposerContentsAncestor: Boolean(target.closest(douyinComposerContentsSelector)),
    hasComposerContentsDescendant: Boolean(contentsHost),
    composerContentsText: stableText(contentsHost).slice(0, 120),
    hasComposerTextAncestor: Boolean(target.closest(douyinComposerSelector)),
    isComposerTarget,
    draftText: readComposerDraft(target)
  });
  return isComposerTarget;
}
function consumeOutgoingSendEvent(event, trigger, target) {
  sendGuestLog({
    tag: "douyin-send-trigger",
    trigger,
    conversationKey: getConversationKey(),
    draftText: readComposerDraft(target),
    targetTag: target.tagName,
    targetText: stableText(target).slice(0, 120)
  });
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  emitDraftComposerMessage(trigger, target);
}
function bindOutgoingComposerCapture() {
  document.addEventListener("keydown", (event) => {
    if (isReplayingSend) {
      return;
    }
    if (!(event.target instanceof Element)) {
      return;
    }
    const isComposerTarget = logComposerKeyboardProbe("douyin-keydown-probe", event, event.target);
    if (isComposerTarget && !isEnterSendEvent(event)) {
      refreshComposerDraft(event.target, "keydown");
    }
    if (!isComposerTarget || !isEnterSendEvent(event)) {
      return;
    }
    sendGuestLog({
      tag: "douyin-enter-intercept",
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      isComposing: event.isComposing,
      conversationKey: getConversationKey(),
      draftText: readComposerDraft(event.target)
    });
    consumeOutgoingSendEvent(event, "enter", event.target);
  }, true);
  document.addEventListener("keyup", (event) => {
    if (isReplayingSend) {
      return;
    }
    if (!(event.target instanceof Element)) {
      return;
    }
    const isComposerTarget = logComposerKeyboardProbe("douyin-keyup-probe", event, event.target);
    if (isComposerTarget && !isEnterSendEvent(event)) {
      refreshComposerDraft(event.target, "keyup");
    }
    if (!isComposerTarget || !isEnterSendEvent(event)) {
      return;
    }
    consumeOutgoingSendEvent(event, "keyup-enter", event.target);
  }, true);
  document.addEventListener("beforeinput", (event) => {
    if (isReplayingSend) {
      return;
    }
    if (!(event instanceof InputEvent) || !(event.target instanceof Element)) {
      return;
    }
    const isComposerTarget = isDouyinComposerEventTarget(event.target);
    if (isComposerTarget && !isBeforeInputSendEvent(event)) {
      refreshComposerDraft(event.target, `beforeinput:${event.inputType}`);
    }
    sendGuestLog({
      tag: "douyin-beforeinput-probe",
      inputType: event.inputType,
      data: event.data ?? "",
      targetTag: event.target.tagName,
      targetText: stableText(event.target).slice(0, 120),
      isComposerTarget,
      draftText: readComposerDraft(event.target)
    });
    if (!isComposerTarget || !isBeforeInputSendEvent(event)) {
      return;
    }
    consumeOutgoingSendEvent(event, "beforeinput-enter", event.target);
  }, true);
  document.addEventListener("input", (event) => {
    if (isReplayingSend) {
      return;
    }
    if (!(event.target instanceof Element) || !isDouyinComposerEventTarget(event.target)) {
      return;
    }
    refreshComposerDraft(event.target, "input");
  }, true);
  const handlePointerSend = (event) => {
    if (isReplayingSend) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const composerRoot = getCurrentComposerRoot(target);
    const isSendButton = isDouyinSendButtonTarget(target);
    const isComposerRootTarget = Boolean(composerRoot?.contains(target));
    const isComposerTextTarget = isDouyinComposerTextEditTarget(target);
    const isIconTarget = ["path", "svg", "use"].includes(target.tagName.toLowerCase());
    const shouldTreatAsSend = isSendButton || isComposerRootTarget && isIconTarget && !isComposerTextTarget && Boolean(readComposerDraft(target));
    sendGuestLog({
      tag: `douyin-${event.type}-probe`,
      targetTag: target.tagName,
      targetText: stableText(target).slice(0, 120),
      isSendButton,
      isComposerRootTarget,
      isComposerTextTarget,
      isIconTarget,
      shouldTreatAsSend,
      draftText: readComposerDraft(target)
    });
    if (!shouldTreatAsSend || event.type === "pointerdown") {
      return;
    }
    sendGuestLog({
      tag: "douyin-button-intercept",
      conversationKey: getConversationKey(),
      draftText: readComposerDraft(target),
      targetText: stableText(target)
    });
    consumeOutgoingSendEvent(event, event.type === "pointerdown" ? "pointer-button" : "button", target);
  };
  document.addEventListener("pointerdown", handlePointerSend, true);
  document.addEventListener("click", handlePointerSend, true);
}
function inspectMessages() {
  if (isDownloadPage()) {
    emitState({
      loginState: "idle",
      captureState: "idle",
      activeUrl: window.location.href,
      lastError: "\u5F53\u524D\u5B98\u65B9\u53EA\u63D0\u4F9B\u6296\u97F3\u804A\u5929\u5BA2\u6237\u7AEF\u4E0B\u8F7D\u9875\uFF0C\u5C1A\u672A\u53D1\u73B0\u53EF\u516C\u5F00\u5D4C\u5165\u7684\u7F51\u9875\u804A\u5929\u5165\u53E3\u3002"
    });
    return;
  }
  logReadyStateTransition("inspect");
  logRawMessageItemDom();
  if (!isDouyinDocumentInspectable(document)) {
    emitDebugSnapshot("loading");
    emitState({
      loginState: "loading",
      captureState: "idle",
      activeUrl: window.location.href,
      lastError: "\u6587\u6863\u4ECD\u5728\u52A0\u8F7D\uFF0C\u7B49\u5F85 DOM \u5C31\u7EEA\u540E\u518D\u68C0\u6D4B\u6D88\u606F\u5BB9\u5668\u3002"
    });
    return;
  }
  const messageContent = getMessageContent();
  const messageItems = getMessageItems();
  emitDebugSnapshot("inspect");
  if (!hasDouyinConversationWindow(document) || !messageContent) {
    emitState({
      loginState: detectLoginState(),
      captureState: "selector_missing",
      activeUrl: window.location.href,
      lastError: `\u672A\u627E\u5230\u6296\u97F3\u4F1A\u8BDD\u6839\u8282\u70B9 ${douyinConversationRootSelector} \u6216\u6D88\u606F\u5BB9\u5668 ${douyinMessageContentSelector}`
    });
    return;
  }
  if (messageItems.length === 0) {
    emitState({
      loginState: detectLoginState(),
      captureState: "selector_missing",
      activeUrl: window.location.href,
      lastError: `\u672A\u627E\u5230\u6296\u97F3\u6D88\u606F\u9879 ${douyinMessageItemSelector}`
    });
    return;
  }
  messageItems.forEach((item, index) => {
    const textNode = findMessageTextNode(item);
    const text = cleanedText(textNode ?? item);
    if (!text) {
      return;
    }
    const bubble = item.closest('[data-e2e="msg-item-content"], [class*="message"], [class*="Message"], [class*="msg"]') || item;
    injectTranslationBubble(bubble);
    const rect = bubble.getBoundingClientRect();
    const direction = detectDouyinMessageDirection(rect.left, window.innerWidth);
    if (direction === "outgoing" && shouldSuppressDouyinOutgoingEcho(pendingTranslatedOutgoing, {
      text,
      conversationKey: getConversationKey(),
      now: Date.now()
    })) {
      pendingTranslatedOutgoing = null;
      return;
    }
    emitMessage({
      sessionId: "",
      direction,
      conversationKey: getConversationKey(),
      messageKey: buildDouyinMessageSignature(text, direction, index),
      text,
      timestamp: Date.now(),
      rawMeta: {
        className: bubble.className || item.className || "",
        textClassName: textNode?.className || ""
      }
    });
  });
  emitState({
    loginState: detectLoginState(),
    captureState: "observing",
    activeUrl: window.location.href
  });
}
function syncLoginState() {
  const nextState = detectLoginState();
  if (nextState !== currentLoginState) {
    currentLoginState = nextState;
    emitState({
      loginState: nextState,
      captureState: nextState === "logged_in" ? "observing" : "idle",
      activeUrl: window.location.href
    });
  }
}
function boot() {
  bindProtocolBlocker();
  bindOutgoingComposerCapture();
  logReadyStateTransition("boot");
  syncLoginState();
  inspectMessages();
  const observer = new MutationObserver(() => {
    syncLoginState();
    inspectMessages();
  });
  observer.observe(resolveDouyinObservationTarget(document), {
    childList: true,
    subtree: true,
    characterData: true
  });
  window.addEventListener("load", () => {
    logReadyStateTransition("load");
    syncLoginState();
    inspectMessages();
  });
  document.addEventListener("readystatechange", () => {
    logReadyStateTransition("force");
    syncLoginState();
    inspectMessages();
  });
  document.addEventListener("DOMContentLoaded", () => {
    logReadyStateTransition("dom-content-loaded");
    syncLoginState();
    inspectMessages();
  });
  setInterval(() => {
    syncLoginState();
    inspectMessages();
  }, 2500);
}
boot();
//# sourceMappingURL=douyin.cjs.map
