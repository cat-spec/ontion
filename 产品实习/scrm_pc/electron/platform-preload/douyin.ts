import { ipcRenderer } from 'electron'
import type { PlatformLoginState, RawPlatformCaptureEvent } from '../../src/platform/contracts'
import { platformIpcChannels } from '../../src/platform/ipc'
import {
  buildDouyinMessageSignature,
  buildDouyinTranslatedOutgoingText,
  collectDouyinDebugSnapshot,
  collectDouyinDocumentSkeleton,
  collectDouyinMessageItemDomPreview,
  collectDouyinPageProbe,
  detectDouyinMessageDirection,
  douyinComposerContentsSelector,
  douyinComposerEditableSelector,
  douyinComposerRootSelector,
  douyinComposerSelector,
  douyinConversationRootSelector,
  douyinMessageContentSelector,
  douyinMessageItemSelector,
  douyinTranslationMarker,
  extractDouyinComposerText,
  hasDouyinConversationWindow,
  isDouyinComposerEventTarget,
  isDouyinComposerTextEditTarget,
  isDouyinSendButtonTarget,
  isDouyinDocumentInspectable,
  isDouyinMessageTextClass,
  normalizeDouyinCapturedText,
  queryDouyinMessageItemNodes,
  queryDouyinMessageNodes,
  resolveDouyinObservationTarget,
  shouldSuppressDouyinOutgoingEcho,
  shouldBlockDouyinProtocolUrl,
} from './douyin-capture'

const seenMessageKeys = new Set<string>()
let currentLoginState: PlatformLoginState = 'idle'
let lastDebugSignature = ''
let lastMessageDomSignature = ''
let lastReadyState = ''
let lastDraftSignature = ''
let lastDraftTimestamp = 0
let isReplayingSend = false
let pendingTranslatedOutgoing:
  | {
    translatedText: string
    conversationKey: string
    expiresAt: number
  }
  | null = null
let lastComposerDraft:
  | {
    text: string
    updatedAt: number
  }
  | null = null

type DouyinSendTrigger = 'enter' | 'keyup-enter' | 'beforeinput-enter' | 'button' | 'pointer-button'

function isDownloadPage() {
  return window.location.host === 'imdesktop.douyin.com'
}

function emitState(payload: {
  loginState?: PlatformLoginState
  captureState?: 'idle' | 'observing' | 'selector_missing' | 'error'
  activeUrl?: string
  lastError?: string
}) {
  ipcRenderer.send(platformIpcChannels.guestStateChanged, payload)
}

function sendGuestLog(payload: Record<string, unknown>) {
  ipcRenderer.send(platformIpcChannels.guestLog, payload)
}

function stableText(node: Element | null) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || ''
}

function cleanedText(node: Element | null) {
  return normalizeDouyinCapturedText(node?.textContent)
}

function getConversationRoot() {
  return document.querySelector<HTMLElement>(douyinConversationRootSelector)
}

function getMessageContent() {
  return getConversationRoot()?.querySelector<HTMLElement>(douyinMessageContentSelector) ?? null
}

function getMessageItems() {
  return queryDouyinMessageNodes<HTMLElement>(document).filter((node) => cleanedText(node).length > 0)
}

function logRawMessageItemDom() {
  const directItems = queryDouyinMessageItemNodes<HTMLElement>(document)
  if (directItems.length === 0) {
    return
  }

  const previews = collectDouyinMessageItemDomPreview(document)
  const signature = JSON.stringify(previews)
  if (signature === lastMessageDomSignature) {
    return
  }

  lastMessageDomSignature = signature
  console.log('[douyin-msg-item-dom]', {
    count: directItems.length,
    selector: douyinMessageItemSelector,
    items: previews,
  })
}

function logReadyStateTransition(reason: string) {
  const nextReadyState = document.readyState || 'unknown'
  if (nextReadyState === lastReadyState && reason !== 'force') {
    return
  }

  lastReadyState = nextReadyState
  console.log('[douyin-ready-state]', {
    reason,
    readyState: nextReadyState,
    url: window.location.href,
    hasBody: Boolean(document.body),
    hasDocumentElement: Boolean(document.documentElement),
  })
}

function findMessageTextNode(item: HTMLElement) {
  const explicitTextNode = item.querySelector<HTMLElement>('.TextMessageTextpureText')
  if (explicitTextNode && cleanedText(explicitTextNode)) {
    return explicitTextNode
  }

  const matchingDescendant = Array.from(item.querySelectorAll<HTMLElement>('*')).find((node) => {
    const className = typeof node.className === 'string' ? node.className : ''
    return isDouyinMessageTextClass(className) && cleanedText(node).length > 0
  })
  if (matchingDescendant) {
    return matchingDescendant
  }

  const ownClassName = typeof item.className === 'string' ? item.className : ''
  if (isDouyinMessageTextClass(ownClassName) && cleanedText(item).length > 0) {
    return item
  }

  return null
}

function injectTranslationBubble(item: HTMLElement) {
  if (item.querySelector(`[${douyinTranslationMarker}]`)) {
    return
  }

  const translation = document.createElement('div')
  translation.setAttribute(douyinTranslationMarker, 'true')
  translation.textContent = 'this is traslation of test.'
  translation.style.marginTop = '8px'
  translation.style.fontSize = '16px'
  translation.style.lineHeight = '1.4'
  translation.style.color = '#10ec73'
  translation.style.opacity = '0.92'
  item.appendChild(translation)
}

function detectLoginState() {
  if (isDownloadPage()) {
    return 'idle'
  }

  if (getMessageItems().length > 0) {
    return 'logged_in'
  }

  if (document.querySelector('canvas, img[alt*="二维码"], [class*="qrcode"]')) {
    return 'qr_required'
  }

  if (document.readyState !== 'complete') {
    return 'loading'
  }

  return 'idle'
}

function getConversationKey() {
  return stableText(
    document.querySelector('[data-e2e="conversation-active"], [class*="conversation"][class*="active"], [class*="title"]'),
  ) || 'unknown'
}

function getCurrentComposerRoot(triggerTarget?: Element | null) {
  return triggerTarget?.closest<HTMLElement>(douyinComposerRootSelector)
    ?? document.querySelector<HTMLElement>(douyinComposerRootSelector)
}
function findCurrentComposerElements(triggerTarget?: Element | null) {
  const composerRoot = getCurrentComposerRoot(triggerTarget)
  const composer = composerRoot?.querySelector<HTMLElement>(douyinComposerSelector)
    ?? document.querySelector<HTMLElement>(douyinComposerSelector)
  const contentsHost = composerRoot?.querySelector<HTMLElement>(douyinComposerContentsSelector)
    ?? composer?.closest<HTMLElement>(douyinComposerContentsSelector)
    ?? null
  const targetEditable = triggerTarget?.closest<HTMLElement>(douyinComposerEditableSelector)
  const editableHost = targetEditable && composerRoot?.contains(targetEditable)
    ? targetEditable
    : composer?.closest<HTMLElement>(douyinComposerEditableSelector)
      ?? composerRoot?.querySelector<HTMLElement>(douyinComposerEditableSelector)
      ?? null

  return {
    composerRoot,
    composer,
    contentsHost,
    editableHost,
  }
}

function readComposerDraft(triggerTarget?: Element | null) {
  const text = extractDouyinComposerText(getCurrentComposerRoot(triggerTarget) ?? document)
  if (text) {
    lastComposerDraft = {
      text,
      updatedAt: Date.now(),
    }
    return text
  }

  if (lastComposerDraft && Date.now() - lastComposerDraft.updatedAt < 30_000) {
    return lastComposerDraft.text
  }

  return ''
}

function refreshComposerDraft(triggerTarget?: Element | null, reason = 'unknown') {
  window.setTimeout(() => {
    const text = extractDouyinComposerText(getCurrentComposerRoot(triggerTarget) ?? document)
    if (!text) {
      return
    }

    lastComposerDraft = {
      text,
      updatedAt: Date.now(),
    }
    sendGuestLog({
      tag: 'douyin-draft-cache',
      reason,
      text,
    })
  }, 0)
}

function dispatchComposerInputEvents(target: HTMLElement, translatedText: string) {
  target.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: translatedText,
    inputType: 'insertReplacementText',
  }))
  target.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: translatedText,
    inputType: 'insertReplacementText',
  }))
  target.dispatchEvent(new Event('change', { bubbles: true }))
}

function rewriteComposerText(translatedText: string, triggerTarget?: Element | null) {
  const { composerRoot, composer, contentsHost, editableHost } = findCurrentComposerElements(triggerTarget)
  if (!composer) {
    sendGuestLog({
      tag: 'douyin-send-rewrite',
      phase: 'missing-composer',
      composerRootSelector: douyinComposerRootSelector,
      composerSelector: douyinComposerSelector,
    })
    return false
  }

  const inputHost = contentsHost
    || editableHost
    || composer
  const focusHost = editableHost || inputHost
  const beforeText = extractDouyinComposerText(composerRoot ?? document)

  focusHost.focus()

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(contentsHost || composer)
  selection?.removeAllRanges()
  selection?.addRange(range)

  dispatchComposerInputEvents(inputHost, translatedText)
  if (focusHost !== inputHost) {
    dispatchComposerInputEvents(focusHost, translatedText)
  }

  let updated = false
  try {
    updated = document.execCommand('insertText', false, translatedText)
  } catch {
    updated = false
  }

  if (!updated) {
    composer.textContent = translatedText
  }

  if (composer.textContent !== translatedText) {
    composer.textContent = translatedText
  }
  if (contentsHost && contentsHost.textContent !== translatedText) {
    contentsHost.textContent = translatedText
  }

  dispatchComposerInputEvents(composer, translatedText)
  if (contentsHost && contentsHost !== composer) {
    dispatchComposerInputEvents(contentsHost, translatedText)
  }
  if (inputHost !== composer) {
    dispatchComposerInputEvents(inputHost, translatedText)
  }

  const afterText = extractDouyinComposerText(composerRoot ?? document)
  sendGuestLog({
    tag: 'douyin-send-rewrite',
    phase: 'rewrite-attempt',
    beforeText,
    afterText,
    translatedText,
    execCommandUpdated: updated,
    composerRootFound: Boolean(composerRoot),
    contentsHostFound: Boolean(contentsHost),
    editableHostFound: Boolean(editableHost),
    contentsHostText: stableText(contentsHost).slice(0, 120),
    inputHostTag: inputHost.tagName,
    inputHostIsDataContents: inputHost.getAttribute('data-contents') ?? '',
    inputHostContentEditable: inputHost.getAttribute('contenteditable') ?? '',
    focusHostTag: focusHost.tagName,
    focusHostContentEditable: focusHost.getAttribute('contenteditable') ?? '',
  })

  return true
}

function findSendButton(root?: ParentNode | null) {
  return Array.from((root ?? document).querySelectorAll<HTMLElement>('button, [role="button"]')).find((node) =>
    stableText(node).includes('发送'),
  ) || null
}

function findSendActionTarget(root?: HTMLElement | null) {
  const sendButton = findSendButton(root)
  if (sendButton) {
    return sendButton
  }

  const scope = root ?? document
  const iconCandidates = Array.from(scope.querySelectorAll<Element>('svg, path, use'))
    .filter((node) => !isDouyinComposerTextEditTarget(node))
    .map((node) => ({
      node,
      rect: node.getBoundingClientRect(),
    }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => b.rect.right - a.rect.right || b.rect.bottom - a.rect.bottom)

  return iconCandidates[0]?.node ?? null
}

function replaySend(
  trigger: DouyinSendTrigger,
  composerRoot: HTMLElement | null,
  translatedText: string,
  originalTarget?: Element | null,
) {
  window.setTimeout(() => {
    const currentText = extractDouyinComposerText(composerRoot ?? document)
    sendGuestLog({
      tag: 'douyin-send-replay',
      trigger,
      phase: 'replay-original-action',
      currentText,
      translatedText,
      originalTargetTag: originalTarget?.tagName || '',
    })

    isReplayingSend = true

    try {
      if (trigger.includes('button') && originalTarget) {
        originalTarget.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }))
        return
      }

      const sendActionTarget = findSendActionTarget(composerRoot)
      if (sendActionTarget) {
        sendGuestLog({
          tag: 'douyin-send-replay',
          trigger,
          phase: 'click-send-action-target',
          targetTag: sendActionTarget.tagName,
          targetText: stableText(sendActionTarget).slice(0, 120),
        })
        sendActionTarget.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }))
        return
      }

      const { composer, editableHost } = findCurrentComposerElements(composerRoot ?? undefined)
      const inputHost = editableHost || composer
      if (inputHost) {
        inputHost.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
        }))
      }
    } finally {
      window.setTimeout(() => {
        isReplayingSend = false
      }, 0)
    }
  }, trigger.includes('button') ? 0 : 16)
}

function emitMessage(event: RawPlatformCaptureEvent) {
  const messageKey = event.messageKey?.trim()
    || `${event.direction}:${event.conversationKey ?? 'unknown'}:${event.timestamp}:${event.text}`

  if (seenMessageKeys.has(messageKey)) {
    return
  }

  seenMessageKeys.add(messageKey)
  console.log('[douyin-capture]', {
    conversationKey: event.conversationKey ?? 'unknown',
    direction: event.direction,
    messageKey,
    text: event.text,
    timestamp: event.timestamp,
    rawMeta: event.rawMeta ?? {},
  })
  ipcRenderer.send(platformIpcChannels.guestEvent, {
    ...event,
    messageKey,
  })
}

function emitDraftComposerMessage(trigger: DouyinSendTrigger, triggerTarget?: Element | null) {
  const composerRoot = getCurrentComposerRoot(triggerTarget)
  const text = readComposerDraft(triggerTarget)
  if (!text) {
    sendGuestLog({
      tag: 'douyin-send-intercept',
      trigger,
      phase: 'skip-empty-draft',
      conversationKey: getConversationKey(),
      composerRootFound: Boolean(composerRoot),
      cachedDraftAge: lastComposerDraft ? Date.now() - lastComposerDraft.updatedAt : null,
    })
    return
  }

  const now = Date.now()
  const signature = `${trigger}|${getConversationKey()}|${text}`
  if (signature === lastDraftSignature && now - lastDraftTimestamp < 1200) {
    sendGuestLog({
      tag: 'douyin-send-intercept',
      trigger,
      phase: 'skip-duplicate-draft',
      conversationKey: getConversationKey(),
      text,
    })
    return
  }

  lastDraftSignature = signature
  lastDraftTimestamp = now

  emitMessage({
    sessionId: '',
    direction: 'outgoing',
    conversationKey: getConversationKey(),
    messageKey: `draft:${signature}:${now}`,
    text,
    timestamp: now,
    rawMeta: {
      phase: 'draft',
      trigger,
      composerSelector: douyinComposerSelector,
      composerRootSelector: douyinComposerRootSelector,
    },
  })

  const translatedText = buildDouyinTranslatedOutgoingText(text)
  sendGuestLog({
    tag: 'douyin-send-intercept',
    trigger,
    phase: 'captured-draft',
    conversationKey: getConversationKey(),
    originalText: text,
    translatedText,
    composerRootFound: Boolean(composerRoot),
  })
  if (rewriteComposerText(translatedText, triggerTarget)) {
    pendingTranslatedOutgoing = {
      translatedText,
      conversationKey: getConversationKey(),
      expiresAt: now + 5000,
    }
    sendGuestLog({
      tag: 'douyin-send-rewrite',
      trigger,
      originalText: text,
      translatedText,
    })
    replaySend(trigger, composerRoot, translatedText, triggerTarget)
  }
}

function emitDebugSnapshot(reason: string) {
  const snapshot = collectDouyinDebugSnapshot(document)
  const pageProbe = snapshot.hasConversationRoot ? [] : collectDouyinPageProbe(document)
  const documentSkeleton = pageProbe.length === 0 ? collectDouyinDocumentSkeleton(document) : null
  const signature = JSON.stringify({
    reason,
    url: window.location.href,
    hasConversationRoot: snapshot.hasConversationRoot,
    hasMessageContent: snapshot.hasMessageContent,
    messageCount: snapshot.messageCount,
    items: snapshot.messageItems,
    probe: pageProbe,
    skeleton: documentSkeleton,
  })

  if (signature === lastDebugSignature) {
    return
  }

  lastDebugSignature = signature
  console.log('[douyin-dom-snapshot]', {
    reason,
    url: window.location.href,
    ...snapshot,
    pageProbe,
    documentSkeleton,
  })
}

function bindProtocolBlocker() {
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) {
      return
    }

    const href = anchor.href
    if (!href || !shouldBlockDouyinProtocolUrl(href)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    emitState({
      activeUrl: window.location.href,
      lastError: `已拦截外部协议跳转: ${href}`,
    })
  }, true)
}

function isEnterSendEvent(event: KeyboardEvent) {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing
}

function isBeforeInputSendEvent(event: InputEvent) {
  return event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak'
}

function logComposerKeyboardProbe(tag: string, event: KeyboardEvent, target: Element) {
  const composerRoot = getCurrentComposerRoot(target)
  const contentsHost = composerRoot?.querySelector<HTMLElement>(douyinComposerContentsSelector) ?? null
  const isComposerTarget = isDouyinComposerEventTarget(target)
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
    draftText: readComposerDraft(target),
  })

  return isComposerTarget
}

function consumeOutgoingSendEvent(event: Event, trigger: DouyinSendTrigger, target: Element) {
  sendGuestLog({
    tag: 'douyin-send-trigger',
    trigger,
    conversationKey: getConversationKey(),
    draftText: readComposerDraft(target),
    targetTag: target.tagName,
    targetText: stableText(target).slice(0, 120),
  })
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  emitDraftComposerMessage(trigger, target)
}

function bindOutgoingComposerCapture() {
  document.addEventListener('keydown', (event) => {
    if (isReplayingSend) {
      return
    }

    if (!(event.target instanceof Element)) {
      return
    }

    const isComposerTarget = logComposerKeyboardProbe('douyin-keydown-probe', event, event.target)
    if (isComposerTarget && !isEnterSendEvent(event)) {
      refreshComposerDraft(event.target, 'keydown')
    }
    if (!isComposerTarget || !isEnterSendEvent(event)) {
      return
    }

    sendGuestLog({
      tag: 'douyin-enter-intercept',
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      isComposing: event.isComposing,
      conversationKey: getConversationKey(),
      draftText: readComposerDraft(event.target),
    })
    consumeOutgoingSendEvent(event, 'enter', event.target)
  }, true)

  document.addEventListener('keyup', (event) => {
    if (isReplayingSend) {
      return
    }

    if (!(event.target instanceof Element)) {
      return
    }

    const isComposerTarget = logComposerKeyboardProbe('douyin-keyup-probe', event, event.target)
    if (isComposerTarget && !isEnterSendEvent(event)) {
      refreshComposerDraft(event.target, 'keyup')
    }
    if (!isComposerTarget || !isEnterSendEvent(event)) {
      return
    }

    consumeOutgoingSendEvent(event, 'keyup-enter', event.target)
  }, true)

  document.addEventListener('beforeinput', (event) => {
    if (isReplayingSend) {
      return
    }

    if (!(event instanceof InputEvent) || !(event.target instanceof Element)) {
      return
    }

    const isComposerTarget = isDouyinComposerEventTarget(event.target)
    if (isComposerTarget && !isBeforeInputSendEvent(event)) {
      refreshComposerDraft(event.target, `beforeinput:${event.inputType}`)
    }
    sendGuestLog({
      tag: 'douyin-beforeinput-probe',
      inputType: event.inputType,
      data: event.data ?? '',
      targetTag: event.target.tagName,
      targetText: stableText(event.target).slice(0, 120),
      isComposerTarget,
      draftText: readComposerDraft(event.target),
    })

    if (!isComposerTarget || !isBeforeInputSendEvent(event)) {
      return
    }

    consumeOutgoingSendEvent(event, 'beforeinput-enter', event.target)
  }, true)

  document.addEventListener('input', (event) => {
    if (isReplayingSend) {
      return
    }

    if (!(event.target instanceof Element) || !isDouyinComposerEventTarget(event.target)) {
      return
    }

    refreshComposerDraft(event.target, 'input')
  }, true)

  const handlePointerSend = (event: MouseEvent | PointerEvent) => {
    if (isReplayingSend) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const composerRoot = getCurrentComposerRoot(target)
    const isSendButton = isDouyinSendButtonTarget(target)
    const isComposerRootTarget = Boolean(composerRoot?.contains(target))
    const isComposerTextTarget = isDouyinComposerTextEditTarget(target)
    const isIconTarget = ['path', 'svg', 'use'].includes(target.tagName.toLowerCase())
    const shouldTreatAsSend = isSendButton
      || (isComposerRootTarget && isIconTarget && !isComposerTextTarget && Boolean(readComposerDraft(target)))
    sendGuestLog({
      tag: `douyin-${event.type}-probe`,
      targetTag: target.tagName,
      targetText: stableText(target).slice(0, 120),
      isSendButton,
      isComposerRootTarget,
      isComposerTextTarget,
      isIconTarget,
      shouldTreatAsSend,
      draftText: readComposerDraft(target),
    })

    if (!shouldTreatAsSend || event.type === 'pointerdown') {
      return
    }

    sendGuestLog({
      tag: 'douyin-button-intercept',
      conversationKey: getConversationKey(),
      draftText: readComposerDraft(target),
      targetText: stableText(target),
    })
    consumeOutgoingSendEvent(event, event.type === 'pointerdown' ? 'pointer-button' : 'button', target)
  }

  document.addEventListener('pointerdown', handlePointerSend, true)
  document.addEventListener('click', handlePointerSend, true)
}

function inspectMessages() {
  if (isDownloadPage()) {
    emitState({
      loginState: 'idle',
      captureState: 'idle',
      activeUrl: window.location.href,
      lastError: '当前官方只提供抖音聊天客户端下载页，尚未发现可公开嵌入的网页聊天入口。',
    })
    return
  }

  logReadyStateTransition('inspect')
  logRawMessageItemDom()

  if (!isDouyinDocumentInspectable(document)) {
    emitDebugSnapshot('loading')
    emitState({
      loginState: 'loading',
      captureState: 'idle',
      activeUrl: window.location.href,
      lastError: '文档仍在加载，等待 DOM 就绪后再检测消息容器。',
    })
    return
  }

  const messageContent = getMessageContent()
  const messageItems = getMessageItems()
  emitDebugSnapshot('inspect')

  if (!hasDouyinConversationWindow(document) || !messageContent) {
    emitState({
      loginState: detectLoginState(),
      captureState: 'selector_missing',
      activeUrl: window.location.href,
      lastError: `未找到抖音会话根节点 ${douyinConversationRootSelector} 或消息容器 ${douyinMessageContentSelector}`,
    })
    return
  }

  if (messageItems.length === 0) {
    emitState({
      loginState: detectLoginState(),
      captureState: 'selector_missing',
      activeUrl: window.location.href,
      lastError: `未找到抖音消息项 ${douyinMessageItemSelector}`,
    })
    return
  }

  messageItems.forEach((item, index) => {
    const textNode = findMessageTextNode(item)
    const text = cleanedText(textNode ?? item)
    if (!text) {
      return
    }

    const bubble = item.closest<HTMLElement>('[data-e2e="msg-item-content"], [class*="message"], [class*="Message"], [class*="msg"]')
      || item
    injectTranslationBubble(bubble)
    const rect = bubble.getBoundingClientRect()
    const direction = detectDouyinMessageDirection(rect.left, window.innerWidth)

    if (direction === 'outgoing' && shouldSuppressDouyinOutgoingEcho(pendingTranslatedOutgoing, {
      text,
      conversationKey: getConversationKey(),
      now: Date.now(),
    })) {
      pendingTranslatedOutgoing = null
      return
    }

    emitMessage({
      sessionId: '',
      direction,
      conversationKey: getConversationKey(),
      messageKey: buildDouyinMessageSignature(text, direction, index),
      text,
      timestamp: Date.now(),
      rawMeta: {
        className: bubble.className || item.className || '',
        textClassName: textNode?.className || '',
      },
    })
  })

  emitState({
    loginState: detectLoginState(),
    captureState: 'observing',
    activeUrl: window.location.href,
  })
}

function syncLoginState() {
  const nextState = detectLoginState()
  if (nextState !== currentLoginState) {
    currentLoginState = nextState
    emitState({
      loginState: nextState,
      captureState: nextState === 'logged_in' ? 'observing' : 'idle',
      activeUrl: window.location.href,
    })
  }
}

function boot() {
  bindProtocolBlocker()
  bindOutgoingComposerCapture()
  logReadyStateTransition('boot')
  syncLoginState()
  inspectMessages()

  const observer = new MutationObserver(() => {
    syncLoginState()
    inspectMessages()
  })

  observer.observe(resolveDouyinObservationTarget(document), {
    childList: true,
    subtree: true,
    characterData: true,
  })

  window.addEventListener('load', () => {
    logReadyStateTransition('load')
    syncLoginState()
    inspectMessages()
  })

  document.addEventListener('readystatechange', () => {
    logReadyStateTransition('force')
    syncLoginState()
    inspectMessages()
  })

  document.addEventListener('DOMContentLoaded', () => {
    logReadyStateTransition('dom-content-loaded')
    syncLoginState()
    inspectMessages()
  })

  setInterval(() => {
    syncLoginState()
    inspectMessages()
  }, 2500)
}

boot()
