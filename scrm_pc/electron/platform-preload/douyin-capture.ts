export const douyinConversationRootSelector = '[data-mask="conversaton-detail-content"]'

export const douyinMessageContentSelector = '#messageContent'
export const douyinMessageItemSelector = '[data-e2e="msg-item-content"]'
export const douyinTranslationMarker = 'data-nexscrm-translation'
export const douyinComposerRootSelector = '[data-e2e="msg-input"]'
export const douyinComposerContentsSelector = '[data-contents="true"]'
export const douyinComposerSelector = 'span[data-text="true"]'
export const douyinComposerEditableSelector = '[contenteditable]:not([contenteditable="false"])'
export const douyinTranslatedOutgoingText = 'this is message of test。'
// export const douyinMessageItemSelector = '[id="messageContent"]'

export interface QueryableLike<TNode = unknown> {
  querySelector(selector: string): TNode | null | undefined
  querySelectorAll(selector: string): Iterable<TNode> | ArrayLike<TNode>
}

export interface DebugElementLike extends QueryableLike<DebugElementLike> {
  tagName?: string
  id?: string
  className?: string
  textContent?: string | null
  getAttribute?(name: string): string | null
  outerHTML?: string
  children?: ArrayLike<DebugElementLike>
  contains?(target: unknown): boolean
  closest?(selector: string): DebugElementLike | null
}

export function isDouyinMessageTextClass(className: string) {
  return /(^|\s)TextMessageTextpureText(\s|$)|TextMessageText/i.test(className)
}

export function hasDouyinConversationWindow(root: QueryableLike) {
  return Boolean(root.querySelector(douyinConversationRootSelector))
}

export function isDouyinDocumentInspectable(documentLike: {
  readyState?: string
  body?: unknown
  documentElement?: unknown
}) {
  const readyState = documentLike.readyState || ''
  const hasStructure = Boolean(documentLike.body || documentLike.documentElement)
  return hasStructure && readyState !== 'loading'
}

export function resolveDouyinObservationTarget<TDocument extends { documentElement?: TNode | null }, TNode = TDocument>(
  documentLike: TDocument,
) {
  return (documentLike.documentElement ?? documentLike) as TNode | TDocument
}

export function queryDouyinMessageNodes<TNode = unknown>(root: QueryableLike<TNode>) {
  const conversationRoot = root.querySelector(douyinConversationRootSelector) as QueryableLike<TNode> | null | undefined
  if (!conversationRoot?.querySelector) {
    return [] as TNode[]
  }

  const messageContent = conversationRoot.querySelector(douyinMessageContentSelector) as QueryableLike<TNode> | null | undefined
  if (!messageContent?.querySelectorAll) {
    return [] as TNode[]
  }

  return Array.from(messageContent.querySelectorAll(douyinMessageItemSelector) ?? [])
}

export function queryDouyinMessageItemNodes<TNode = unknown>(root: QueryableLike<TNode>) {
  const nodes = Array.from(root.querySelectorAll(douyinMessageItemSelector) ?? [])
  return nodes.filter((node, index) => {
    return !nodes.some((candidate, candidateIndex) => {
      if (candidateIndex === index || candidate === node) {
        return false
      }

      return typeof (candidate as DebugElementLike).contains === 'function'
        && (candidate as DebugElementLike).contains?.(node)
    })
  })
}

function normalizeText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || ''
}

export function normalizeDouyinCapturedText(text: string | null | undefined) {
  return normalizeText(text).replace(/点赞回复删除$/, '').trim()
}

export function extractDouyinComposerText(root: QueryableLike<DebugElementLike>) {
  const composerRoot = root.querySelector(douyinComposerRootSelector)
  const candidates = [
    composerRoot?.querySelector?.(douyinComposerSelector),
    root.querySelector(douyinComposerSelector),
    composerRoot?.querySelector?.(douyinComposerContentsSelector),
    root.querySelector(douyinComposerContentsSelector),
    composerRoot?.querySelector?.(douyinComposerEditableSelector),
    root.querySelector(douyinComposerEditableSelector),
  ]

  for (const candidate of candidates) {
    const text = normalizeDouyinCapturedText(candidate?.textContent)
    if (text) {
      return text
    }
  }

  return ''
}

export function buildDouyinTranslatedOutgoingText(_text: string) {
  return douyinTranslatedOutgoingText
}

export function isDouyinComposerEventTarget(target: DebugElementLike | null | undefined) {
  if (!target) {
    return false
  }

  if (
    target.closest?.(douyinComposerSelector)
    || target.closest?.(douyinComposerContentsSelector)
    || target.closest?.(douyinComposerRootSelector)
  ) {
    return true
  }

  const editableHost = target.closest?.(douyinComposerEditableSelector)
  if (editableHost?.querySelector?.(douyinComposerSelector)) {
    return true
  }

  return Boolean(target.querySelector?.(douyinComposerSelector))
}

export function isDouyinComposerTextEditTarget(target: DebugElementLike | null | undefined) {
  if (!target) {
    return false
  }

  if (
    target.closest?.(douyinComposerSelector)
    || target.closest?.(douyinComposerContentsSelector)
    || target.closest?.(douyinComposerEditableSelector)
  ) {
    return true
  }

  return Boolean(
    target.querySelector?.(douyinComposerSelector)
    || target.querySelector?.(douyinComposerContentsSelector)
    || target.querySelector?.(douyinComposerEditableSelector),
  )
}

export function isDouyinSendButtonTarget(target: DebugElementLike | null | undefined) {
  const button = target?.closest?.('button, [role="button"]') ?? null
  const buttonText = normalizeText(button?.textContent)
  return buttonText.includes('发送')
}

export function shouldSuppressDouyinOutgoingEcho(
  pending:
    | {
      translatedText: string
      conversationKey: string
      expiresAt: number
    }
    | null
    | undefined,
  candidate: {
    text: string
    conversationKey: string
    now: number
  },
) {
  if (!pending) {
    return false
  }

  return pending.expiresAt >= candidate.now
    && pending.translatedText === candidate.text
    && pending.conversationKey === candidate.conversationKey
}

function summarizeDebugNode(node: DebugElementLike | null | undefined) {
  if (!node) {
    return null
  }

  return {
    tagName: node.tagName || '',
    id: node.id || '',
    className: typeof node.className === 'string' ? node.className : '',
    text: normalizeText(node.textContent).slice(0, 120),
  }
}

function summarizeProbeNode(node: DebugElementLike) {
  return {
    tagName: node.tagName || '',
    id: node.id || '',
    className: typeof node.className === 'string' ? node.className : '',
    text: normalizeText(node.textContent).slice(0, 120),
    dataE2e: node.getAttribute?.('data-e2e') || '',
    dataMask: node.getAttribute?.('data-mask') || '',
  }
}

function getOuterHtmlPreview(node: DebugElementLike | null | undefined) {
  return node?.outerHTML?.replace(/\s+/g, ' ').trim().slice(0, 240) || ''
}

export function collectDouyinMessageItemDomPreview(root: QueryableLike<DebugElementLike>) {
  return queryDouyinMessageItemNodes(root)
    .slice(0, 10)
    .map((node) => ({
      tagName: node.tagName || '',
      id: node.id || '',
      className: typeof node.className === 'string' ? node.className : '',
      text: normalizeDouyinCapturedText(node.textContent).slice(0, 120),
      outerHTML: getOuterHtmlPreview(node),
    }))
}

export function collectDouyinDebugSnapshot(root: QueryableLike<DebugElementLike>) {
  const conversationRoot = root.querySelector(douyinConversationRootSelector)
  const messageContent = conversationRoot?.querySelector?.(douyinMessageContentSelector) ?? null
  const messageItems = queryDouyinMessageNodes(root)

  return {
    hasConversationRoot: Boolean(conversationRoot),
    hasMessageContent: Boolean(messageContent),
    messageCount: messageItems.length,
    conversationRoot: summarizeDebugNode(conversationRoot),
    messageContent: summarizeDebugNode(messageContent),
    messageItems: messageItems.slice(0, 5).map((node) => summarizeDebugNode(node)),
  }
}

export function collectDouyinPageProbe(root: QueryableLike<DebugElementLike>) {
  const allNodes = Array.from(root.querySelectorAll('*') ?? [])
  const seenKeys = new Set<string>()

  return allNodes
    .filter((node) => {
      const className = typeof node.className === 'string' ? node.className : ''
      const id = node.id || ''
      const dataE2e = node.getAttribute?.('data-e2e') || ''
      const dataMask = node.getAttribute?.('data-mask') || ''
      const text = normalizeText(node.textContent)

      return Boolean(
        isDouyinMessageTextClass(className)
        || /message|conversation|chat|msg/i.test(className)
        || /message|conversation|chat|msg/i.test(id)
        || /message|conversation|chat|msg/i.test(dataE2e)
        || /conversation|message/i.test(dataMask)
        || (text.length > 0 && text.length <= 80 && /会话|消息|聊天/.test(text)),
      )
    })
    .map((node) => summarizeProbeNode(node))
    .filter((node) => {
      const signature = `${node.tagName}|${node.id}|${node.className}|${node.dataE2e}|${node.dataMask}|${node.text}`
      if (seenKeys.has(signature)) {
        return false
      }
      seenKeys.add(signature)
      return true
    })
    .slice(0, 20)
}

export function collectDouyinDocumentSkeleton(documentLike: {
  readyState?: string
  title?: string
  location?: { href?: string }
  body?: DebugElementLike | null
  documentElement?: DebugElementLike | null
}) {
  const htmlNode = documentLike.documentElement ?? null
  const bodyNode = documentLike.body ?? null
  const bodyChildren = Array.from(bodyNode?.children ?? []).slice(0, 10)

  return {
    readyState: documentLike.readyState || '',
    title: documentLike.title || '',
    href: documentLike.location?.href || '',
    documentText: normalizeText(bodyNode?.textContent ?? htmlNode?.textContent ?? '').slice(0, 240),
    html: summarizeDebugNode(htmlNode),
    body: summarizeDebugNode(bodyNode),
    bodyChildren: bodyChildren.map((node) => summarizeDebugNode(node)),
    htmlPreview: getOuterHtmlPreview(htmlNode),
    bodyPreview: getOuterHtmlPreview(bodyNode),
  }
}

export function detectDouyinMessageDirection(left: number, viewportWidth: number) {
  return left > viewportWidth / 2 ? 'outgoing' : 'incoming'
}

export function buildDouyinMessageSignature(
  text: string,
  direction: 'incoming' | 'outgoing',
  index: number,
) {
  return `${direction}|${index}|${text.trim()}`
}

export function shouldBlockDouyinProtocolUrl(url: string) {
  try {
    const parsed = new URL(url)
    return !['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
