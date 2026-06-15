# 抖音 Web 容器 DOM 消息捕获与发送拦截完整复盘

## 1. 项目目标

本阶段目标是在 Electron 桌面端中，把抖音网页接入项目右侧工作区，并通过 `WebContentsView + preload + DOM 观察` 实现一个最小可行的消息链路：

- 捕获当前会话里的接收消息。
- 捕获当前账号发送的原文消息。
- 在发送前把原文替换为固定测试译文 `this is message of test。`。
- 把捕获到的收发事件回传到 Vue 工作台右侧时间线。
- 不使用 `iframe`。
- 不使用网络层 `fetch/XHR/WebSocket` 拦截。
- 不调用抖音页面内部私有 JS API。
- 只依赖可观察 DOM 和浏览器事件。

整体方案选择 Electron，是因为第三方平台页面存在跨域、登录态、浏览器隔离、外部协议跳转等问题，纯 Web iframe 难以稳定控制。

## 2. 总体架构

整体链路分为三层：

```text
Vue Renderer 工作台
  -> 通过 window.electronPlatform 调用主进程 IPC
  -> Electron Main 创建/管理 WebContentsView
  -> WebContentsView 加载抖音网页
  -> 抖音平台 preload 注入页面
  -> preload 观察 DOM / 拦截发送事件
  -> guest IPC 回传主进程
  -> 主进程标准化事件后推送给 Vue 时间线
```

关键职责：

- `electron/main.ts`：负责主窗口、WebContentsView、session、bounds、白名单导航、IPC 转发。
- `electron/preload.ts`：给 Vue renderer 暴露安全桥接 API。
- `electron/platform-preload/douyin.ts`：注入抖音页面，做 DOM 捕获、输入草稿缓存、发送拦截、发送改写。
- `electron/platform-preload/douyin-capture.ts`：封装抖音 DOM 选择器、文本清洗、去重、方向判断等可测试逻辑。
- `src/components/client/BrowserContainerHost.vue`：作为 WebContentsView 的 DOM 宿主，上报 bounds。
- `src/components/client/CaptureTimelinePanel.vue`：展示捕获到的标准消息事件。

## 3. Web 容器接入方式

第三方页面不放进 Vue DOM，也不使用 iframe，而是由主进程创建原生 `WebContentsView`。

每个抖音会话使用独立持久分区：

```ts
persist:nexscrm:douyin:{sessionId}
```

这样扫码登录后，关闭重开仍可复用登录态。

主进程创建容器时指定平台 preload：

```ts
new WebContentsView({
  webPreferences: {
    contextIsolation: true,
    sandbox: false,
    nodeIntegration: false,
    preload: resolveGuestPreload('douyin.cjs'),
    partition: record.partition,
  },
})
```

Vue 侧通过 `ResizeObserver + getBoundingClientRect()` 把右侧宿主区域实时上报给主进程：

```ts
bridge.setBounds({
  sessionId,
  x: rect.left,
  y: rect.top,
  width: rect.width,
  height: rect.height,
  visible: rect.width > 0 && rect.height > 0,
})
```

主进程再调用：

```ts
view.setBounds({
  x,
  y,
  width,
  height,
})
```

注意：`WebContentsView` 是 Electron 原生视图层，会盖住 Vue DOM。为了让消息时间线在平台连接后仍能显示，时间线展开时，Vue 宿主区域需要给右侧时间线让出宽度，使 WebContentsView 的 bounds 不覆盖时间线区域。

## 4. DOM 消息捕获原理

### 4.1 核心 DOM 选择器

通过调试抖音页面 DOM，确认当前会话消息区域的关键结构：

```ts
const conversationRootSelector = '[data-mask="conversaton-detail-content"]'
const messageContentSelector = '#messageContent'
const messageItemSelector = '[data-e2e="msg-item-content"]'
const messageTextSelector = '.TextMessageTextpureText'
```

含义：

- `[data-mask="conversaton-detail-content"]`：当前会话详情根节点。
- `#messageContent`：当前会话消息列表容器。
- `[data-e2e="msg-item-content"]`：每一条消息项。
- `.TextMessageTextpureText`：消息文本节点。

### 4.2 为什么之前读不到 DOM

早期调试中出现过：

```text
hasBody: false
hasDocumentElement: false
readyState: "loading"
messageCount: 0
```

原因是 preload 注入时机非常早，页面还处于 `loading`，`document.body`、`document.documentElement` 甚至都可能不可读。此时直接查询消息 DOM 会得到空结果。

后续修正点：

- preload 启动后立即绑定监听，但不把早期空 DOM 当成选择器失效。
- 通过 `isDouyinDocumentInspectable()` 判断文档是否可读。
- `MutationObserver` 优先观察 `document.documentElement`，如果不存在则退回 `document`。
- 增加 `load`、`DOMContentLoaded`、`readystatechange` 和 `setInterval` 兜底扫描。

### 4.3 启动监听周期

preload 启动入口：

```ts
boot()
```

核心流程：

```ts
function boot() {
  bindProtocolBlocker()
  bindOutgoingComposerCapture()
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

  window.addEventListener('load', inspectMessages)
  document.addEventListener('readystatechange', inspectMessages)
  document.addEventListener('DOMContentLoaded', inspectMessages)

  setInterval(() => {
    syncLoginState()
    inspectMessages()
  }, 2500)
}
```

监听职责：

- `MutationObserver`：捕获新增消息、DOM 重绘、切换会话。
- `characterData: true`：捕获文本节点内容变化。
- `setInterval(2500ms)`：兜底扫描，防止 SPA 局部更新漏捕。
- 页面生命周期事件：处理首次加载和路由稳定后的补扫。

### 4.4 消息节点查询

正式捕获只认三层结构：

```ts
document
  .querySelector('[data-mask="conversaton-detail-content"]')
  ?.querySelector('#messageContent')
  ?.querySelectorAll('[data-e2e="msg-item-content"]')
```

这样避免扫描全页面导致误捕评论、推荐卡片、系统文案等非聊天消息。

### 4.5 文本提取与清洗

每条消息优先读取：

```ts
item.querySelector('.TextMessageTextpureText')
```

如果找不到，则从当前消息项及后代里兜底查找含 `TextMessageText` 的 class。

文本清洗逻辑：

```ts
function normalizeDouyinCapturedText(text?: string | null) {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/点赞回复删除$/, '')
    .trim()
}
```

原因是抖音消息节点的 `textContent` 可能把操作按钮文案拼进去，例如：

```text
你好点赞回复删除
```

清洗后只保留：

```text
你好
```

### 4.6 消息方向判断

MVP 阶段没有解析抖音内部数据结构，直接用气泡位置判断方向：

```ts
function detectDouyinMessageDirection(left: number, viewportWidth: number) {
  return left > viewportWidth / 2 ? 'outgoing' : 'incoming'
}
```

逻辑：

- 气泡在左侧：对方发来的消息，记为 `incoming`。
- 气泡在右侧：当前账号发出的消息，记为 `outgoing`。

### 4.7 去重策略

DOM 重绘、滚动历史消息、切换会话都可能导致同一条消息重复出现在扫描结果中。

MVP 使用稳定签名去重：

```ts
const messageKey = `${direction}|${index}|${text.trim()}`
```

并维护：

```ts
const seenMessageKeys = new Set<string>()
```

如果 `messageKey` 已存在，则跳过。

### 4.8 事件回传

捕获后的消息会通过 guest IPC 发到主进程：

```ts
ipcRenderer.send(platformIpcChannels.guestEvent, {
  sessionId: '',
  direction,
  conversationKey,
  messageKey,
  text,
  timestamp: Date.now(),
  rawMeta: {},
})
```

主进程根据 `event.sender.id` 反查真实 `sessionId`：

```ts
const sessionId = webContentsToSessionId.get(event.sender.id)
```

再通过平台 adapter 标准化为：

```ts
{
  platformId,
  sessionId,
  direction,
  conversationKey,
  messageKey,
  text,
  timestamp,
  rawMeta,
}
```

最后推送给 Vue renderer 时间线。

## 5. 输入消息捕获原理

### 5.1 输入框 DOM 结构

调试确认的输入区结构：

```ts
const composerRootSelector = '[data-e2e="msg-input"]'
const composerContentsSelector = '[data-contents="true"]'
const composerTextSelector = 'span[data-text="true"]'
const composerEditableSelector = '[contenteditable]:not([contenteditable="false"])'
```

含义：

- `[data-e2e="msg-input"]`：整个输入组件根节点，包含输入框、发送按钮、图标等。
- `[data-contents="true"]`：富文本内容承载层。
- `span[data-text="true"]`：具体文本承载节点。
- `[contenteditable]`：真实可编辑宿主，可能由 React/Draft 类编辑器维护内部状态。

### 5.2 为什么不能只读 `span[data-text="true"]`

实际测试发现，输入内容在不同阶段可能出现在不同层：

- 刚输入时，`keydown` 阶段 DOM 还没同步，读取为空。
- `span[data-text="true"]` 有时为空。
- `[data-contents="true"]` 可能有文本。
- `[contenteditable]` 也可能作为兜底承载文本。

因此读取顺序必须兜底：

```ts
[
  span[data-text="true"],
  [data-contents="true"],
  [contenteditable]:not([contenteditable="false"])
]
```

### 5.3 草稿读取函数

核心逻辑：

```ts
function extractDouyinComposerText(root) {
  const composerRoot = root.querySelector('[data-e2e="msg-input"]')
  const candidates = [
    composerRoot?.querySelector('span[data-text="true"]'),
    root.querySelector('span[data-text="true"]'),
    composerRoot?.querySelector('[data-contents="true"]'),
    root.querySelector('[data-contents="true"]'),
    composerRoot?.querySelector('[contenteditable]:not([contenteditable="false"])'),
    root.querySelector('[contenteditable]:not([contenteditable="false"])'),
  ]

  for (const candidate of candidates) {
    const text = normalizeDouyinCapturedText(candidate?.textContent)
    if (text) return text
  }

  return ''
}
```

### 5.4 为什么需要草稿缓存

用户输入 `111` 时，日志显示：

```text
keydown Digit1
targetText: ''
composerContentsText: ''
draftText: ''
```

原因是 `keydown` 触发早于编辑器 DOM 更新。

解决方案是监听 `input`，并异步缓存最近一次非空草稿：

```ts
let lastComposerDraft = null

function refreshComposerDraft(target, reason) {
  setTimeout(() => {
    const text = extractDouyinComposerText(getCurrentComposerRoot(target) ?? document)
    if (!text) return

    lastComposerDraft = {
      text,
      updatedAt: Date.now(),
    }
  }, 0)
}
```

发送时读取：

```ts
const text = extractDouyinComposerText(currentRoot) || lastComposerDraft?.text || ''
```

这样即使发送事件发生时 DOM 当前读不到文本，也可以使用最近一次输入后的缓存。

## 6. 发送拦截与文本改写

### 6.1 发送触发来源

实际测试中有两种发送入口：

- 点击发送图标。
- 按下 Enter。

点击发送图标时，事件目标不是按钮文字，而是 SVG 内部节点：

```text
targetTag: path
targetText: ''
```

所以不能依赖：

```ts
button.textContent.includes('发送')
```

### 6.2 点击发送图标判断

点击目标可能是：

```ts
path
svg
use
```

判断是否是发送点击：

```ts
function isTextEditTarget(target) {
  return Boolean(
    target.closest('span[data-text="true"]')
    || target.closest('[data-contents="true"]')
    || target.closest('[contenteditable]:not([contenteditable="false"])')
  )
}

function shouldTreatAsSendClick(target) {
  const root = target.closest('[data-e2e="msg-input"]')
  if (!root) return false

  const isIcon = ['path', 'svg', 'use'].includes(target.tagName.toLowerCase())
  return isIcon && !isTextEditTarget(target) && Boolean(readComposerDraft(target))
}
```

关键点：

- `target` 必须在 `[data-e2e="msg-input"]` 内。
- `target` 必须是图标类节点。
- `target` 不能是文本编辑区。
- 当前必须有草稿文本。

### 6.3 为什么不在 pointerdown 阶段阻断

早期测试发现，如果在 `pointerdown` 就阻断，可能破坏抖音页面自己的 click 链路。

最终策略：

- `pointerdown`：只打印诊断日志，不阻断。
- `click`：真正拦截并执行改写发送。

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

### 6.4 回车发送拦截

回车发送在 capture 阶段拦截：

```ts
document.addEventListener('keydown', (event) => {
  if (!(event.target instanceof Element)) return
  if (event.key !== 'Enter') return
  if (event.shiftKey || event.isComposing) return
  if (!event.target.closest('[data-e2e="msg-input"]')) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  handleSend(event.target)
}, true)
```

关键点：

- `Shift + Enter` 保留为换行。
- 中文输入法 composition 期间不作为发送。
- 不重放合成 `KeyboardEvent('keydown')` 作为主发送方式。
- 改写后优先点击发送图标发送。

### 6.5 统一发送处理

发送入口统一到一个函数：

```ts
function handleSend(triggerTarget) {
  const originalText = readComposerDraft(triggerTarget)
  if (!originalText) return

  emitMessage({
    direction: 'outgoing',
    text: originalText,
    rawMeta: { phase: 'draft' },
  })

  const translatedText = 'this is message of test。'
  const ok = rewriteComposerText(translatedText, triggerTarget)
  if (!ok) return

  replaySend(triggerTarget)
}
```

执行顺序：

```text
捕获原文
  -> 原文写入时间线
  -> 输入框改写为固定译文
  -> 重放发送动作
```

## 7. 输入框文本改写

### 7.1 为什么不能只改 `textContent`

直接：

```ts
composer.textContent = translatedText
```

可能只改变 DOM 表面展示，但抖音编辑器内部状态仍然是原文。对方收到的可能仍是原文。

因此需要尽量模拟真实输入：

- focus 编辑器。
- 选中文本节点内容。
- 调用 `document.execCommand('insertText')`。
- 同步改写兜底 DOM。
- 派发 `beforeinput`、`input`、`change` 事件。

### 7.2 改写逻辑

核心策略：

```ts
function rewriteComposerText(translatedText, triggerTarget) {
  const root = getCurrentComposerRoot(triggerTarget)
  const composer = root.querySelector('span[data-text="true"]')
  const contentsHost = root.querySelector('[data-contents="true"]')
  const editableHost = root.querySelector('[contenteditable]:not([contenteditable="false"])')

  const inputHost = contentsHost || editableHost || composer
  const focusHost = editableHost || inputHost

  focusHost.focus()

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(contentsHost || composer)
  selection.removeAllRanges()
  selection.addRange(range)

  document.execCommand('insertText', false, translatedText)

  composer.textContent = translatedText
  contentsHost.textContent = translatedText

  dispatchInputEvents(composer, translatedText)
  dispatchInputEvents(contentsHost, translatedText)
  dispatchInputEvents(inputHost, translatedText)

  return true
}
```

事件派发：

```ts
function dispatchInputEvents(target, text) {
  target.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertReplacementText',
  }))

  target.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: text,
    inputType: 'insertReplacementText',
  }))

  target.dispatchEvent(new Event('change', { bubbles: true }))
}
```

## 8. 重放发送

点击发送图标已验证可以发送。因此重放策略是：

### 8.1 点击发送时

优先重放原始点击目标：

```ts
originalTarget.dispatchEvent(new MouseEvent('click', {
  bubbles: true,
  cancelable: true,
  view: window,
}))
```

### 8.2 回车发送时

回车拦截后，不再合成 Enter 作为主路径，而是查找输入根内最可能的发送图标：

```ts
function findSendActionTarget(root) {
  return Array.from(root.querySelectorAll('svg, path, use'))
    .filter((node) => !isTextEditTarget(node))
    .map((node) => ({
      node,
      rect: node.getBoundingClientRect(),
    }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => b.rect.right - a.rect.right || b.rect.bottom - a.rect.bottom)[0]?.node
}
```

然后触发点击：

```ts
sendActionTarget.dispatchEvent(new MouseEvent('click', {
  bubbles: true,
  cancelable: true,
  view: window,
}))
```

## 9. 状态与日志设计

### 9.1 运行状态

preload 会上报：

- `loginState`
- `captureState`
- `activeUrl`
- `lastError`

用于右侧状态栏展示。

### 9.2 调试日志

使用专用 IPC：

```ts
platform:guest-log
```

而不是只依赖 guest console。

关键日志：

- `douyin-ready-state`：文档加载状态。
- `douyin-dom-snapshot`：正式选择器命中情况。
- `douyin-msg-item-dom`：消息节点 DOM 摘要。
- `douyin-draft-cache`：输入草稿缓存。
- `douyin-keydown-probe`：键盘事件探针。
- `douyin-click-probe`：点击发送图标探针。
- `douyin-send-trigger`：发送动作被消费。
- `douyin-send-intercept`：原文被捕获。
- `douyin-send-rewrite`：文本改写结果。
- `douyin-send-replay`：发送动作重放。

## 10. 关键问题与解决方案

### 10.1 preload 启动太早，DOM 为空

解决方案：

- 不把早期空 DOM 直接视为选择器失效。
- 增加文档可读判断。
- 使用 `MutationObserver` + 生命周期事件 + 定时兜底。

### 10.2 消息节点带操作文案

问题：

```text
消息正文点赞回复删除
```

解决方案：

```ts
replace(/点赞回复删除$/, '')
```

### 10.3 时间线重复出现消息

原因：

- DOM 重绘。
- 滚动历史消息。
- 嵌套 `msg-item-content`。

解决方案：

- 过滤嵌套消息节点。
- 使用 `messageKey` 去重。

### 10.4 输入框读取为空

原因：

- `keydown` 早于 DOM 同步。
- 文本不一定在 `span[data-text]`。

解决方案：

- 多层兜底读取。
- `input` 后异步缓存最近草稿。

### 10.5 发送按钮不是文字按钮

原因：

点击 target 是：

```text
path
```

解决方案：

- 不依赖按钮文字。
- 判断输入根内非文本编辑区的 `svg/path/use`。

### 10.6 回车发送无法靠合成 Enter 重放

原因：

合成 `KeyboardEvent` 不一定被页面编辑器当成真实发送。

解决方案：

- 回车拦截后复用点击发送图标路径。

### 10.7 WebContentsView 盖住 Vue 时间线

原因：

`WebContentsView` 是 Electron 原生视图层，层级高于 renderer DOM。

解决方案：

- 时间线展开时缩小 WebContentsView bounds，为时间线预留右侧宽度。
- 时间线收起后恢复 Web 容器全宽。

## 11. 最终链路

### 11.1 接收消息链路

```text
MutationObserver 触发
  -> inspectMessages()
  -> 定位当前会话根
  -> 定位 #messageContent
  -> 查询 data-e2e="msg-item-content"
  -> 提取 TextMessageTextpureText
  -> 清洗点赞回复删除
  -> 根据左右位置判断 incoming/outgoing
  -> messageKey 去重
  -> IPC 回传主进程
  -> 主进程标准化事件
  -> Vue 时间线展示
```

### 11.2 点击发送链路

```text
用户点击发送图标
  -> click capture 阶段命中 path/svg/use
  -> 判断在 msg-input 内且不是文本编辑区
  -> preventDefault + stopImmediatePropagation
  -> 读取原文草稿
  -> 原文写入时间线
  -> 输入框改成 this is message of test。
  -> 重放原始点击 target
  -> 抖音页面发送译文
```

### 11.3 回车发送链路

```text
用户按 Enter
  -> keydown capture 阶段拦截
  -> 排除 Shift+Enter 和输入法 composing
  -> 读取原文草稿
  -> 原文写入时间线
  -> 输入框改成 this is message of test。
  -> 查找输入根内发送图标
  -> 触发发送图标 click
  -> 抖音页面发送译文
```

## 12. 当前 MVP 边界

当前阶段已经验证：

- WebContentsView 可嵌入抖音页面。
- 可捕获当前会话 DOM 消息。
- 可在消息气泡下注入测试翻译内容。
- 可捕获输入框草稿。
- 可拦截点击发送图标。
- 可拦截 Enter 发送。
- 可发送前替换文本。
- 可把原文输出到项目时间线。

当前阶段暂不做：

- 不做网络层消息解析。
- 不做多会话真实业务分流。
- 不做真实翻译服务调用。
- 不做代理出口控制。
- 不做抖音内部 API 调用。
- 不保证抖音 DOM 大改版后的长期稳定。

## 13. 可扩展方向

下一阶段可以扩展：

- 把固定译文替换为真实翻译 API。
- 引入 conversationKey 的更稳定识别。
- 优化 messageKey，使用 DOM 属性或时间特征降低重复/漏捕。
- 增加 DOM 选择器配置化。
- 增加平台 adapter 的统一 preload config。
- 接入 Telegram、WhatsApp Web 等其他平台。
- 增加消息持久化存储。
- 增加发送失败回滚和重试策略。

## 14. 可写入简历的表达

### 14.1 项目经历版

Electron 多平台客服容器 MVP：

- 基于 Electron `WebContentsView` 设计并实现第三方平台网页容器接入方案，将 Vue 工作台与抖音 Web 页面进行隔离集成，支持独立持久化登录分区和会话级容器管理。
- 设计 `preload + MutationObserver + DOM Selector` 消息捕获链路，在不接入平台私有 API、不拦截网络层的前提下，实现抖音聊天消息的接收/发送 DOM 识别、文本清洗、方向判断、去重与事件标准化回传。
- 实现富文本输入框发送拦截能力，针对 `contenteditable`、`data-contents`、`span[data-text]` 等复杂 DOM 结构设计多层草稿读取和缓存策略，解决 keydown 阶段 DOM 未同步导致的空文本问题。
- 实现发送前消息改写流程：捕获用户原文并写入系统时间线，随后将第三方页面输入框内容替换为目标译文，并通过发送图标重放机制完成平台侧真实发送。
- 处理 Electron 原生视图层与 Vue DOM 层级冲突，通过动态调整 WebContentsView bounds 保证平台页面接入后业务时间线仍可见、可操作。

### 14.2 技术亮点版

- 使用 `WebContentsView` 替代 iframe，实现第三方 Web 平台在桌面端的受控嵌入、持久化登录和原生容器布局管理。
- 基于 DOM 观察构建低侵入消息捕获方案，规避跨域和平台私有 API 依赖，降低接入成本和合规风险。
- 通过 `MutationObserver + 定时兜底 + 生命周期事件` 组合提升 SPA 页面消息捕获稳定性。
- 针对富文本编辑器实现多层输入草稿读取、异步缓存、发送事件拦截和改写后重放发送。
- 建立主进程 IPC 标准事件通道，实现 guest 页面事件到 Vue 工作台状态管理和时间线 UI 的完整闭环。

### 14.3 简历短句版

- 基于 Electron `WebContentsView` 实现抖音 Web 聊天容器接入，完成会话级持久化登录、DOM 消息捕获、发送拦截与事件回传。
- 设计 `preload + MutationObserver` 消息采集链路，实现第三方平台聊天消息的 DOM 识别、文本清洗、方向判断和去重。
- 实现富文本输入框发送前改写能力，支持捕获用户原文、替换为目标译文并重放平台发送动作。
- 解决 Electron 原生视图覆盖 Vue DOM 的层级问题，通过动态 bounds 管理保证 Web 容器与业务时间线协同展示。

### 14.4 面试讲解版

这个项目的难点不是简单嵌入网页，而是要在不接入抖音官方接口、不拦截 WebSocket 的前提下，稳定捕获网页聊天消息并修改发送内容。我使用 Electron `WebContentsView` 承载第三方页面，通过平台专属 preload 注入 DOM 监听逻辑。接收消息通过 `MutationObserver` 观察消息列表 DOM，定位当前会话消息容器后提取消息文本、清洗操作文案、判断收发方向并去重。发送消息部分通过监听输入框 `input` 缓存草稿，再在 `click` 或 `keydown Enter` 的 capture 阶段拦截发送意图，先把用户原文回传到系统时间线，再将抖音输入框内容改写为目标译文，最后复用页面自己的发送图标 click 完成真实发送。整个链路保持了对第三方页面的低侵入，同时为后续扩展 Telegram、WhatsApp 等平台预留了统一 adapter 结构。

