# 抖音 DOM 消息捕获与发送改写 MVP

## 目标

在 Electron `WebContentsView` 内嵌抖音网页，通过平台 preload 做最小 DOM 监听：

- 捕获接收消息。
- 捕获发送原文。
- 发送前把原文替换为 `this is message of test。`。
- 把收发事件回传到主应用时间线。
- 不做 `fetch`、`XHR`、`WebSocket` 拦截。
- 不调用抖音内部私有 JS API。

## 核心 DOM 选择器

消息区：

```ts
const conversationRootSelector = '[data-mask="conversaton-detail-content"]'
const messageContentSelector = '#messageContent'
const messageItemSelector = '[data-e2e="msg-item-content"]'
const messageTextSelector = '.TextMessageTextpureText'
```

发送输入区：

```ts
const composerRootSelector = '[data-e2e="msg-input"]'
const composerContentsSelector = '[data-contents="true"]'
const composerTextSelector = 'span[data-text="true"]'
const composerEditableSelector = '[contenteditable]:not([contenteditable="false"])'
```

## 启动监听

preload 启动后立即执行，不等待页面完全 loaded：

```ts
boot()
```

最小启动流程：

```ts
function boot() {
  bindOutgoingCapture()
  inspectMessages()

  new MutationObserver(() => {
    inspectMessages()
  }).observe(document.documentElement ?? document, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  setInterval(inspectMessages, 2500)
}
```

监听周期：

- `MutationObserver`：实时捕获新增消息和 DOM 更新。
- `setInterval(2500ms)`：兜底扫描，防止 SPA 局部更新漏掉。
- `load`、`DOMContentLoaded`、`readystatechange` 可作为补充触发，但不是核心链路。

## 接收消息捕获

只扫描当前会话窗口：

```ts
function queryMessageItems() {
  return Array.from(
    document
      .querySelector(conversationRootSelector)
      ?.querySelector(messageContentSelector)
      ?.querySelectorAll(messageItemSelector) ?? [],
  )
}
```

文本提取：

```ts
function extractMessageText(item: Element) {
  const textNode = item.querySelector(messageTextSelector) ?? item
  return normalizeText(textNode.textContent)
}
```

文本清洗：

```ts
function normalizeText(text?: string | null) {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/点赞回复删除$/, '')
    .trim()
}
```

方向判断：

```ts
function detectDirection(item: Element) {
  const rect = item.getBoundingClientRect()
  return rect.left > window.innerWidth / 2 ? 'outgoing' : 'incoming'
}
```

去重键：

```ts
const messageKey = `${direction}|${index}|${text}`
```

事件回传：

```ts
ipcRenderer.send('platform:guest-event', {
  direction,
  conversationKey,
  messageKey,
  text,
  timestamp: Date.now(),
  rawMeta: {},
})
```

## 输入草稿读取

读取顺序必须兜底，不能只读 `span[data-text="true"]`：

```ts
function readDraft(root: ParentNode = document) {
  const msgInput = root.querySelector(composerRootSelector) ?? root

  const candidates = [
    msgInput.querySelector(composerTextSelector),
    msgInput.querySelector(composerContentsSelector),
    msgInput.querySelector(composerEditableSelector),
  ]

  for (const node of candidates) {
    const text = normalizeText(node?.textContent)
    if (text) return text
  }

  return ''
}
```

维护最近非空草稿缓存：

```ts
let lastDraft = ''

function refreshDraft(target: Element) {
  setTimeout(() => {
    const text = readDraft(target.closest(composerRootSelector) ?? document)
    if (text) lastDraft = text
  }, 0)
}
```

绑定输入缓存：

```ts
document.addEventListener('input', (event) => {
  if (!(event.target instanceof Element)) return
  if (!event.target.closest(composerRootSelector)) return

  refreshDraft(event.target)
}, true)
```

发送时读取：

```ts
const originalText = readDraft() || lastDraft
```

## 点击发送图标

实际点击目标可能是 SVG 内部节点：

```ts
path
svg
use
```

不要依赖按钮文字“发送”。

文本编辑区判断：

```ts
function isTextEditTarget(target: Element) {
  return Boolean(
    target.closest(composerTextSelector)
    || target.closest(composerContentsSelector)
    || target.closest(composerEditableSelector),
  )
}
```

发送点击判断：

```ts
function shouldTreatAsSendClick(target: Element) {
  const root = target.closest(composerRootSelector)
  if (!root) return false

  const tag = target.tagName.toLowerCase()
  const isIcon = ['path', 'svg', 'use'].includes(tag)

  return isIcon && !isTextEditTarget(target) && Boolean(readDraft(root) || lastDraft)
}
```

只在 `click` 阶段真正拦截，`pointerdown` 只做诊断，不阻断：

```ts
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return
  if (!shouldTreatAsSendClick(event.target)) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  handleSend(event.target)
}, true)
```

## 回车发送

回车发送与点击发送共用同一个 `handleSend()`。

```ts
document.addEventListener('keydown', (event) => {
  if (!(event.target instanceof Element)) return
  if (event.key !== 'Enter') return
  if (event.shiftKey || event.isComposing) return
  if (!event.target.closest(composerRootSelector)) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  handleSend(event.target)
}, true)
```

注意：回车发送不要重放合成 `KeyboardEvent('keydown')` 作为主路径。已验证更稳定的方式是改写后主动点击发送图标。

## 发送前替换文本

固定测试译文：

```ts
const translatedText = 'this is message of test。'
```

最小替换逻辑：

```ts
function rewriteComposerText(text: string) {
  const root = document.querySelector(composerRootSelector)
  if (!root) return false

  const textNode =
    root.querySelector(composerTextSelector)
    || root.querySelector(composerContentsSelector)
    || root.querySelector(composerEditableSelector)

  if (!(textNode instanceof HTMLElement)) return false

  const editable =
    textNode.closest(composerEditableSelector) as HTMLElement
    || textNode

  editable.focus()

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(textNode)
  selection?.removeAllRanges()
  selection?.addRange(range)

  document.execCommand('insertText', false, text)

  textNode.textContent = text

  textNode.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: text,
    inputType: 'insertReplacementText',
  }))

  editable.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: text,
    inputType: 'insertReplacementText',
  }))

  return true
}
```

## 统一发送处理

```ts
function handleSend(originalTarget: Element) {
  const originalText = readDraft() || lastDraft
  if (!originalText) return

  sendTimelineEvent({
    direction: 'outgoing',
    text: originalText,
    rawMeta: { phase: 'draft' },
  })

  const ok = rewriteComposerText('this is message of test。')
  if (!ok) return

  setTimeout(() => {
    replaySend(originalTarget)
  }, 0)
}
```

## 重放发送

点击发送时，优先重放原始点击目标：

```ts
function replaySend(originalTarget?: Element) {
  if (originalTarget && ['path', 'svg', 'use'].includes(originalTarget.tagName.toLowerCase())) {
    originalTarget.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }))
    return
  }

  findSendIcon()?.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  }))
}
```

回车发送时，查找发送图标并点击：

```ts
function findSendIcon() {
  const root = document.querySelector(composerRootSelector)
  if (!root) return null

  return Array.from(root.querySelectorAll('svg, path, use'))
    .filter((node) => !isTextEditTarget(node))
    .map((node) => ({
      node,
      rect: node.getBoundingClientRect(),
    }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => b.rect.right - a.rect.right || b.rect.bottom - a.rect.bottom)[0]?.node ?? null
}
```

## 最小完整链路

```text
preload 启动
  -> 绑定 MutationObserver 监听消息列表
  -> 绑定 input 缓存草稿
  -> 绑定 click 发送图标
  -> 绑定 keydown Enter
  -> 发送触发时读取原文
  -> 原文发到时间线
  -> 输入框内容替换为 this is message of test。
  -> 点击发送图标
  -> 抖音页面自己完成发送
```

## 明确不做

- 不拦截 `WebSocket`。
- 不拦截 `fetch` / `XHR`。
- 不调用抖音内部 JS API。
- 不使用 `iframe`。
- 不依赖按钮文字“发送”。
- 不在 `pointerdown` 阶段阻断发送。
- 不只读 `span[data-text="true"]`。
- 回车发送不以合成 `KeyboardEvent('keydown')` 作为主发送路径。

