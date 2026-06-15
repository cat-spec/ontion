import type { PlatformMessageDirection } from '../../src/platform/contracts'

export interface TextNodeLike {
  nodeType: number
  textContent?: string | null
}

export interface ElementNodeLike extends TextNodeLike {
  tagName?: string
  classList?: { contains(className: string): boolean }
  alt?: string
  childNodes?: Iterable<TextNodeLike | ElementNodeLike> | ArrayLike<TextNodeLike | ElementNodeLike>
}

export function normalizePlatformText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() || ''
}

export function shouldSkipTranslation(text: string | null | undefined) {
  return normalizePlatformText(text).length === 0
}

export function buildPlatformMessageKey(input: {
  direction: PlatformMessageDirection
  conversationKey: string
  timestamp: number
  text: string
}) {
  return `${input.direction}:${input.conversationKey}:${input.timestamp}:${normalizePlatformText(input.text)}`
}

export function splitOutgoingLines(text: string | null | undefined) {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function extractEditableText(root: ElementNodeLike | null | undefined) {
  if (!root) {
    return ''
  }

  const parts: string[] = []
  const children = Array.from(root.childNodes ?? [])

  if (children.length === 0) {
    return root.textContent ?? ''
  }

  for (const node of children) {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? '')
      continue
    }

    const element = node as ElementNodeLike
    const tagName = element.tagName?.toUpperCase() ?? ''
    if (tagName === 'BR') {
      parts.push('\n')
      continue
    }
    if (tagName === 'IMG' && element.classList?.contains('emoji')) {
      parts.push(element.alt ?? '')
      continue
    }

    if (element.childNodes && Array.from(element.childNodes).length > 0) {
      parts.push(extractEditableText(element))
      continue
    }

    parts.push(element.textContent ?? '')
  }

  return parts.join('')
}

export function createTranslationNode(text: string) {
  const translation = document.createElement('div')
  translation.className = 'custom-translate-node'
  translation.textContent = text
  return translation
}

export function createLoadingNode() {
  const loadingNode = document.createElement('div')
  loadingNode.className = 'nexscrm-translation-loading'
  loadingNode.setAttribute('data-nexscrm-loading', 'true')

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('span')
    dot.className = 'nexscrm-translation-loading__dot'
    dot.style.animationDelay = `${index * 0.2}s`
    loadingNode.appendChild(dot)
  }

  return loadingNode
}

export function ensureTranslationStyles() {
  if (document.getElementById('nexscrm-translation-style')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'nexscrm-translation-style'
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
  `
  document.head.appendChild(style)
}

export function appendNode(parent: Element | null | undefined, node: Element) {
  if (!parent) {
    return false
  }

  parent.appendChild(node)
  return true
}

export function removeNode(node: Element | null | undefined) {
  node?.remove()
}
