import type { PlatformId, PlatformLoginState, PlatformMessageDirection } from '../../src/platform/contracts'
import {
  appendNode,
  buildPlatformMessageKey,
  createLoadingNode,
  createTranslationNode,
  ensureTranslationStyles,
  extractEditableText,
  normalizePlatformText,
  removeNode,
  shouldSkipTranslation,
  splitOutgoingLines,
} from './multi-platform-capture'
import {
  emitPlatformEvent,
  emitPlatformState,
  getCachedTranslation,
  getPlatformLanguageList,
  logPlatformGuest,
  saveCachedTranslation,
  translatePlatformText,
} from './multi-platform-runtime'

interface MessageCandidate {
  element: HTMLElement
  text: string
  direction?: PlatformMessageDirection
  conversationKey?: string
  rawMeta?: Record<string, unknown>
}

interface WebChatPreloadConfig {
  platformId: PlatformId
  loginSelectors: string[]
  qrSelectors: string[]
  messageSelector: string
  messageContainerSelector: string
  messageTextSelector?: string
  inputSelector: string
  sendButtonSelector: string
  conversationSelector?: string
  unreadSelector?: string
  languageStorage: {
    local: string
    target: string
    defaultLocal: string
    defaultTarget: string
  }
  cacheDbName: string
  toolbarAnchorSelector?: string
  collectMessages?: () => MessageCandidate[]
  readDraft?: (input: HTMLElement) => string
  writeDraft?: (input: HTMLElement, translatedText: string) => void
  shouldBypassSendTranslation?: (input: HTMLElement) => boolean
}

let languages: Array<{ code: string; displayName: string; name?: string }> = []
const seenMessages = new Set<string>()
const translatedElements = new WeakSet<HTMLElement>()

function getStoredLanguage(key: string, fallback: string) {
  return localStorage.getItem(key) || fallback
}

function setStoredLanguage(key: string, value: string) {
  localStorage.setItem(key, value)
}

function getConversationKey(config: WebChatPreloadConfig) {
  const selectorText = config.conversationSelector
    ? normalizePlatformText(document.querySelector(config.conversationSelector)?.textContent)
    : ''
  return selectorText || window.location.hash || document.title || 'unknown'
}

function detectDirection(element: HTMLElement): PlatformMessageDirection {
  const className = element.className || ''
  const dir = element.getAttribute('data-message-author') || element.getAttribute('data-testid') || ''
  if (/out|own|sent|message-out|is-out|is-sent/i.test(`${className} ${dir}`)) {
    return 'outgoing'
  }
  return 'incoming'
}

function detectLoginState(config: WebChatPreloadConfig): PlatformLoginState {
  if (config.loginSelectors.some((selector) => document.querySelector(selector))) {
    return 'logged_in'
  }
  if (config.qrSelectors.some((selector) => document.querySelector(selector))) {
    return 'qr_required'
  }
  if (document.readyState !== 'complete') {
    return 'loading'
  }
  return 'idle'
}

function defaultCollectMessages(config: WebChatPreloadConfig): MessageCandidate[] {
  return Array.from(document.querySelectorAll<HTMLElement>(config.messageSelector))
    .map((element) => {
      const textElement = config.messageTextSelector
        ? element.querySelector<HTMLElement>(config.messageTextSelector)
        : element
      const text = normalizePlatformText(textElement?.textContent)
      return {
        element: textElement ?? element,
        text,
        direction: detectDirection(element),
        conversationKey: getConversationKey(config),
      }
    })
    .filter((candidate) => candidate.text.length > 0)
}

function emitCapturedMessage(config: WebChatPreloadConfig, candidate: MessageCandidate, direction?: PlatformMessageDirection) {
  const timestamp = Date.now()
  const conversationKey = candidate.conversationKey || getConversationKey(config)
  const messageDirection = direction || candidate.direction || detectDirection(candidate.element)
  const key = buildPlatformMessageKey({
    direction: messageDirection,
    conversationKey,
    timestamp,
    text: candidate.text,
  })

  if (seenMessages.has(`${messageDirection}:${conversationKey}:${candidate.text}`)) {
    return
  }

  seenMessages.add(`${messageDirection}:${conversationKey}:${candidate.text}`)
  emitPlatformEvent({
    sessionId: '',
    direction: messageDirection,
    conversationKey,
    messageKey: key,
    text: candidate.text,
    timestamp,
    rawMeta: candidate.rawMeta ?? {},
  })
}

async function translateWithCache(config: WebChatPreloadConfig, text: string, targetLanguage: string) {
  const cached = await getCachedTranslation(config.cacheDbName, text, targetLanguage)
  if (cached?.translatedText) {
    return cached.translatedText
  }

  const translatedText = await translatePlatformText({
    text,
    local: getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal),
    target: targetLanguage,
  })
  if (!translatedText) {
    return null
  }

  await saveCachedTranslation(config.cacheDbName, text, translatedText, targetLanguage)
  return translatedText
}

async function translateIncomingCandidate(config: WebChatPreloadConfig, candidate: MessageCandidate) {
  const text = candidate.text
  const targetLanguage = getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal)
  if (translatedElements.has(candidate.element) || shouldSkipTranslation(text)) {
    return
  }

  translatedElements.add(candidate.element)
  candidate.element.setAttribute('data-translate-status', 'processing')
  ensureTranslationStyles()
  const loadingNode = createLoadingNode()
  appendNode(candidate.element, loadingNode)

  try {
    const translatedText = await translateWithCache(config, text, targetLanguage)
    removeNode(loadingNode)
    if (!translatedText) {
      candidate.element.setAttribute('data-translate-status', 'failed')
      return
    }

    candidate.element.setAttribute('data-translate-status', 'Translated')
    candidate.element.setAttribute('data-language-type', targetLanguage)
    appendNode(candidate.element, createTranslationNode(translatedText))
  } catch (error) {
    removeNode(loadingNode)
    candidate.element.setAttribute('data-translate-status', 'failed')
    logPlatformGuest({
      tag: `${config.platformId}-incoming-translate-error`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function processMessageList(config: WebChatPreloadConfig) {
  const candidates = config.collectMessages?.() ?? defaultCollectMessages(config)
  if (candidates.length === 0) {
    return
  }

  emitPlatformState({
    loginState: 'logged_in',
    captureState: 'observing',
    activeUrl: window.location.href,
  })

  for (const candidate of candidates) {
    emitCapturedMessage(config, candidate)
    if (candidate.direction !== 'outgoing') {
      void translateIncomingCandidate(config, candidate)
    }
  }
}

function readDefaultDraft(input: HTMLElement) {
  return extractEditableText(input) || input.innerText || input.textContent || ''
}

function writeDefaultDraft(input: HTMLElement, translatedText: string) {
  input.textContent = translatedText
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: translatedText,
    inputType: 'insertText',
  }))
}

async function handleSend(config: WebChatPreloadConfig, event: KeyboardEvent, input: HTMLElement) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey) {
    return
  }
  if (config.shouldBypassSendTranslation?.(input)) {
    return
  }

  const existingLoading = document.getElementById('editDivLoadingNode')
  if (existingLoading) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    return
  }

  const originalText = config.readDraft?.(input) ?? readDefaultDraft(input)
  const lines = splitOutgoingLines(originalText)
  if (lines.length === 0) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  ensureTranslationStyles()
  const loadingNode = createLoadingNode()
  loadingNode.id = 'editDivLoadingNode'
  appendNode(input.parentElement, loadingNode)

  try {
    const targetLanguage = getStoredLanguage(config.languageStorage.target, config.languageStorage.defaultTarget)
    const translatedLines = await Promise.all(lines.map((line) => translateWithCache(config, line, targetLanguage)))
    if (translatedLines.some((line) => !line)) {
      removeNode(loadingNode)
      return
    }

    const translatedText = translatedLines.filter(Boolean).join('\n')
    emitCapturedMessage(config, {
      element: input,
      text: originalText,
      direction: 'outgoing',
      conversationKey: getConversationKey(config),
      rawMeta: { translatedText },
    }, 'outgoing')
    ;(config.writeDraft ?? writeDefaultDraft)(input, translatedText)
    removeNode(loadingNode)
    window.setTimeout(() => {
      const trigger = document.querySelector<HTMLElement>(config.sendButtonSelector)
      const button = trigger?.closest<HTMLElement>('button, [role="button"]') ?? trigger
      button?.click()
    }, 0)
  } catch (error) {
    removeNode(loadingNode)
    logPlatformGuest({
      tag: `${config.platformId}-send-translate-error`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function bindSendInterceptor(config: WebChatPreloadConfig) {
  const input = document.querySelector<HTMLElement>(config.inputSelector)
  if (!input || input.dataset.nexscrmSendBound === 'true') {
    return
  }

  input.dataset.nexscrmSendBound = 'true'
  input.addEventListener('keydown', (event) => {
    void handleSend(config, event, input)
  }, true)
}

function addLanguageControl(config: WebChatPreloadConfig) {
  if (!config.toolbarAnchorSelector || document.getElementById('customLanguageNode') || languages.length === 0) {
    return
  }

  const anchor = document.querySelector<HTMLElement>(config.toolbarAnchorSelector)
  if (!anchor?.parentElement) {
    return
  }

  ensureTranslationStyles()
  const button = document.createElement('button')
  button.id = 'customLanguageNode'
  button.type = 'button'
  button.className = 'translate-btn'
  button.textContent = '译'
  button.style.cssText = 'border:none;background:transparent;cursor:pointer;font-size:16px;padding:4px;color:#2563eb;'

  const popup = document.createElement('div')
  popup.className = 'select-box-popup'
  popup.style.cssText = 'position:absolute;display:none;z-index:10000;width:200px;padding:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.12);'

  const localBox = document.createElement('div')
  const targetBox = document.createElement('div')
  const refreshLabels = () => {
    localBox.textContent = `Local: ${getStoredLanguage(config.languageStorage.local, config.languageStorage.defaultLocal)}`
    targetBox.textContent = `Target: ${getStoredLanguage(config.languageStorage.target, config.languageStorage.defaultTarget)}`
  }
  refreshLabels()

  for (const box of [localBox, targetBox]) {
    box.style.cssText = 'padding:8px;border:1px solid #e2e8f0;margin-bottom:8px;cursor:pointer;'
    popup.appendChild(box)
  }

  function showLanguageList(storageKey: string, fallback: string) {
    const list = document.createElement('div')
    list.style.cssText = 'position:absolute;z-index:10001;max-height:180px;overflow:auto;background:#fff;border:1px solid #cbd5e1;color:#0f172a;box-shadow:0 8px 20px rgba(15,23,42,.12);'
    const rect = popup.getBoundingClientRect()
    list.style.top = `${rect.top}px`
    list.style.left = `${rect.right + 4}px`

    languages.forEach((language) => {
      const option = document.createElement('div')
      option.textContent = language.displayName || language.code
      option.style.cssText = 'padding:8px 12px;cursor:pointer;'
      option.addEventListener('click', () => {
        setStoredLanguage(storageKey, language.code || fallback)
        document.querySelectorAll('.custom-translate-node').forEach((node) => node.remove())
        document.querySelectorAll('[data-translate-status]').forEach((node) => node.removeAttribute('data-translate-status'))
        list.remove()
        refreshLabels()
      })
      list.appendChild(option)
    })

    document.body.appendChild(list)
  }

  localBox.addEventListener('click', (event) => {
    event.stopPropagation()
    showLanguageList(config.languageStorage.local, config.languageStorage.defaultLocal)
  })
  targetBox.addEventListener('click', (event) => {
    event.stopPropagation()
    showLanguageList(config.languageStorage.target, config.languageStorage.defaultTarget)
  })
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    const rect = button.getBoundingClientRect()
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none'
    popup.style.top = `${rect.top - 96}px`
    popup.style.left = `${rect.left}px`
  })
  document.addEventListener('click', () => {
    popup.style.display = 'none'
  })

  anchor.parentElement.insertBefore(button, anchor.nextSibling)
  document.body.appendChild(popup)
}

function checkUnread(config: WebChatPreloadConfig) {
  if (!config.unreadSelector) {
    return
  }
  const unread = document.querySelector(config.unreadSelector)
  if (unread && document.visibilityState !== 'visible') {
    logPlatformGuest({ tag: `${config.platformId}-unread`, text: normalizePlatformText(unread.textContent) })
  }
}

async function initializeLanguages() {
  try {
    languages = await getPlatformLanguageList()
  } catch {
    languages = []
  }
}

export function startWebChatPreload(config: WebChatPreloadConfig) {
  ensureTranslationStyles()
  void initializeLanguages()

  const tick = () => {
    emitPlatformState({
      loginState: detectLoginState(config),
      captureState: document.querySelector(config.messageContainerSelector) ? 'observing' : 'selector_missing',
      activeUrl: window.location.href,
    })
    bindSendInterceptor(config)
    addLanguageControl(config)
    checkUnread(config)
    void processMessageList(config)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick, { once: true })
  } else {
    tick()
  }

  const observerTarget = document.documentElement || document.body
  const observer = new MutationObserver(() => tick())
  observer.observe(observerTarget, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'] })
  window.setInterval(tick, 1500)
}
