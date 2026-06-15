import { describe, expect, it } from 'vitest'
import {
  buildDouyinMessageSignature,
  buildDouyinTranslatedOutgoingText,
  collectDouyinDebugSnapshot,
  collectDouyinDocumentSkeleton,
  collectDouyinMessageItemDomPreview,
  collectDouyinPageProbe,
  detectDouyinMessageDirection,
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
} from '../electron/platform-preload/douyin-capture'

function createQueryable(
  selectors: Record<string, unknown>,
  lists: Record<string, unknown[]> = {},
) {
  return {
    querySelector(selector: string) {
      return (selectors[selector] as typeof selectors[string] | undefined) ?? null
    },
    querySelectorAll(selector: string) {
      return lists[selector] ?? []
    },
  }
}

describe('douyin capture helpers', () => {
  it('matches the discovered TextMessageTextpureText class', () => {
    expect(isDouyinMessageTextClass('TextMessageTextpureText')).toBe(true)
    expect(isDouyinMessageTextClass('foo TextMessageTextpureText bar')).toBe(true)
    expect(isDouyinMessageTextClass('foo TextMessageText bar')).toBe(true)
    expect(isDouyinMessageTextClass('CommentMessageText')).toBe(false)
  })

  it('derives outgoing direction from right-side layout', () => {
    expect(detectDouyinMessageDirection(820, 1200)).toBe('outgoing')
    expect(detectDouyinMessageDirection(180, 1200)).toBe('incoming')
  })

  it('builds a stable minimal signature for message dedupe', () => {
    expect(buildDouyinMessageSignature('people', 'incoming', 2)).toBe('incoming|2|people')
  })

  it('strips the douyin action suffix from captured message text', () => {
    expect(normalizeDouyinCapturedText('people点赞回复删除')).toBe('people')
    expect(normalizeDouyinCapturedText('This is a test点赞回复删除')).toBe('This is a test')
    expect(normalizeDouyinCapturedText(' 一二三点赞回复删除 ')).toBe('一二三')
    expect(normalizeDouyinCapturedText('正常消息')).toBe('正常消息')
  })

  it('extracts the current composer draft text from span[data-text="true"]', () => {
    const composer = {
      textContent: '你好，测试发送',
    }
    const documentLike = createQueryable({
      'span[data-text="true"]': composer,
    })

    expect(extractDouyinComposerText(documentLike)).toBe('你好，测试发送')
  })

  it('falls back to data-contents when the composer span is not populated yet', () => {
    const contents = {
      textContent: '1111',
      querySelector() {
        return null
      },
    }
    const root = createQueryable({
      '[data-contents="true"]': contents,
    })
    const documentLike = createQueryable({
      '[data-e2e="msg-input"]': root,
    })

    expect(extractDouyinComposerText(documentLike)).toBe('1111')
  })

  it('rewrites outgoing drafts to the fixed translated message', () => {
    expect(buildDouyinTranslatedOutgoingText('你好')).toBe('this is message of test。')
    expect(buildDouyinTranslatedOutgoingText('anything')).toBe('this is message of test。')
  })

  it('treats the contenteditable host that contains span[data-text="true"] as a composer target', () => {
    const composerSpan = {
      textContent: '你好',
    }
    const editableHost = {
      querySelector(selector: string) {
        return selector === 'span[data-text="true"]' ? composerSpan : null
      },
      closest(selector: string) {
        return selector === '[contenteditable="true"]' ? this : null
      },
    }
    const plainDiv = {
      querySelector() {
        return null
      },
      closest() {
        return null
      },
    }

    expect(isDouyinComposerEventTarget(editableHost)).toBe(true)
    expect(isDouyinComposerEventTarget(plainDiv)).toBe(false)
  })

  it('does not treat an svg send icon in msg-input as the text edit target', () => {
    const svgPath = {
      closest(selector: string) {
        return selector === '[data-e2e="msg-input"]' ? { kind: 'root' } : null
      },
      querySelector() {
        return null
      },
    }
    const textSpan = {
      closest(selector: string) {
        return selector === 'span[data-text="true"]' ? this : null
      },
      querySelector() {
        return null
      },
    }

    expect(isDouyinComposerEventTarget(svgPath)).toBe(true)
    expect(isDouyinComposerTextEditTarget(svgPath)).toBe(false)
    expect(isDouyinComposerTextEditTarget(textSpan)).toBe(true)
  })

  it('recognizes click targets inside the send button', () => {
    const sendButton = {
      textContent: '发送',
      closest(selector: string) {
        return selector === 'button, [role="button"]' ? this : null
      },
    }
    const icon = {
      closest(selector: string) {
        return selector === 'button, [role="button"]' ? sendButton : null
      },
    }
    const otherButton = {
      textContent: '取消',
      closest(selector: string) {
        return selector === 'button, [role="button"]' ? this : null
      },
    }

    expect(isDouyinSendButtonTarget(icon)).toBe(true)
    expect(isDouyinSendButtonTarget(otherButton)).toBe(false)
  })

  it('suppresses the immediate outgoing echo after composer rewrite', () => {
    expect(shouldSuppressDouyinOutgoingEcho({
      translatedText: 'this is message of test。',
      conversationKey: '搜索',
      expiresAt: 10_000,
    }, {
      text: 'this is message of test。',
      conversationKey: '搜索',
      now: 9_000,
    })).toBe(true)

    expect(shouldSuppressDouyinOutgoingEcho({
      translatedText: 'this is message of test。',
      conversationKey: '搜索',
      expiresAt: 10_000,
    }, {
      text: '别的内容',
      conversationKey: '搜索',
      now: 9_000,
    })).toBe(false)
  })

  it('blocks custom protocols but keeps http and https', () => {
    expect(shouldBlockDouyinProtocolUrl('bytedance://dispatch_message/')).toBe(true)
    expect(shouldBlockDouyinProtocolUrl('mailto:test@example.com')).toBe(true)
    expect(shouldBlockDouyinProtocolUrl('https://www.douyin.com/')).toBe(false)
    expect(shouldBlockDouyinProtocolUrl('http://www.douyin.com/')).toBe(false)
  })

  it('only inspects the douyin document after dom becomes readable', () => {
    expect(isDouyinDocumentInspectable({
      readyState: 'loading',
      body: null,
      documentElement: null,
    })).toBe(false)

    expect(isDouyinDocumentInspectable({
      readyState: 'interactive',
      body: { tagName: 'BODY' },
      documentElement: { tagName: 'HTML' },
    })).toBe(true)

    expect(isDouyinDocumentInspectable({
      readyState: 'complete',
      body: { tagName: 'BODY' },
      documentElement: { tagName: 'HTML' },
    })).toBe(true)
  })

  it('falls back to document when documentElement is still missing', () => {
    const documentLike = {
      kind: 'document',
      documentElement: null,
    }
    const htmlNode = {
      kind: 'html',
    }

    expect(resolveDouyinObservationTarget(documentLike)).toBe(documentLike)
    expect(resolveDouyinObservationTarget({
      ...documentLike,
      documentElement: htmlNode,
    })).toBe(htmlNode)
  })

  it('locates the live conversation window and message nodes from confirmed selectors', () => {
    const first = {
      tagName: 'DIV',
      className: 'TextMessageTextpureText',
      textContent: 'hello',
      querySelector: () => null,
      querySelectorAll: () => [],
    }
    const second = {
      tagName: 'DIV',
      className: 'TextMessageTextpureText',
      textContent: 'world',
      querySelector: () => null,
      querySelectorAll: () => [],
    }
    const content = createQueryable({}, {
      '[data-e2e="msg-item-content"]': [first, second],
    })
    const root = createQueryable({
      '#messageContent': content,
    })
    const documentLike = createQueryable({
      '[data-mask="conversaton-detail-content"]': root,
    })

    expect(hasDouyinConversationWindow(documentLike)).toBe(true)
    expect(queryDouyinMessageNodes<{ textContent?: string }>(documentLike).map((node) => node.textContent?.trim())).toEqual([
      'hello',
      'world',
    ])
  })

  it('directly queries msg-item-content nodes and builds printable dom previews', () => {
    const first = {
      tagName: 'DIV',
      id: 'msg-1',
      className: 'item-a',
      textContent: 'hello',
      outerHTML: '<div data-e2e="msg-item-content" id="msg-1" class="item-a">hello</div>',
    }
    const second = {
      tagName: 'DIV',
      id: 'msg-2',
      className: 'item-b',
      textContent: 'world',
      outerHTML: '<div data-e2e="msg-item-content" id="msg-2" class="item-b">world</div>',
    }
    const documentLike = createQueryable({}, {
      '[data-e2e="msg-item-content"]': [first, second],
    })

    expect(queryDouyinMessageItemNodes(documentLike)).toEqual([first, second])
    expect(collectDouyinMessageItemDomPreview(documentLike)).toEqual([
      {
        tagName: 'DIV',
        id: 'msg-1',
        className: 'item-a',
        text: 'hello',
        outerHTML: '<div data-e2e="msg-item-content" id="msg-1" class="item-a">hello</div>',
      },
      {
        tagName: 'DIV',
        id: 'msg-2',
        className: 'item-b',
        text: 'world',
        outerHTML: '<div data-e2e="msg-item-content" id="msg-2" class="item-b">world</div>',
      },
    ])
  })

  it('drops nested msg-item-content nodes so one logical message is only captured once', () => {
    const inner = {
      tagName: 'DIV',
      id: 'msg-inner',
      className: 'item-inner',
      textContent: 'hello',
      outerHTML: '<div data-e2e="msg-item-content" id="msg-inner">hello</div>',
      contains(target: unknown) {
        return target === this
      },
    }
    const outer = {
      tagName: 'DIV',
      id: 'msg-outer',
      className: 'item-outer',
      textContent: 'hello',
      outerHTML: '<div data-e2e="msg-item-content" id="msg-outer"><div data-e2e="msg-item-content" id="msg-inner">hello</div></div>',
      contains(target: unknown) {
        return target === this || target === inner
      },
    }
    const documentLike = createQueryable({}, {
      '[data-e2e="msg-item-content"]': [outer, inner],
    })

    expect(queryDouyinMessageItemNodes(documentLike)).toEqual([outer])
  })

  it('builds a readable snapshot for the embedded douyin DOM', () => {
    const first = {
      tagName: 'DIV',
      className: 'TextMessageTextpureText',
      textContent: ' 第一条消息 ',
      querySelector: () => null,
      querySelectorAll: () => [],
    }
    const second = {
      tagName: 'DIV',
      className: 'TextMessageTextpureText',
      textContent: '第二条消息',
      querySelector: () => null,
      querySelectorAll: () => [],
    }
    const content = {
      tagName: 'DIV',
      id: 'messageContent',
      className: 'message-content',
      textContent: '第一条消息 第二条消息',
      querySelector: () => null,
      querySelectorAll(selector: string) {
        return selector === '[data-e2e="msg-item-content"]' ? [first, second] : []
      },
    }
    const root = {
      tagName: 'DIV',
      className: 'conversation-root',
      textContent: '第一条消息 第二条消息',
      querySelector(selector: string) {
        return selector === '#messageContent' ? content : null
      },
      querySelectorAll() {
        return []
      },
    }
    const documentLike = createQueryable({
      '[data-mask="conversaton-detail-content"]': root,
    })

    expect(collectDouyinDebugSnapshot(documentLike)).toEqual({
      hasConversationRoot: true,
      hasMessageContent: true,
      messageCount: 2,
      conversationRoot: {
        tagName: 'DIV',
        id: '',
        className: 'conversation-root',
        text: '第一条消息 第二条消息',
      },
      messageContent: {
        tagName: 'DIV',
        id: 'messageContent',
        className: 'message-content',
        text: '第一条消息 第二条消息',
      },
      messageItems: [
        {
          tagName: 'DIV',
          id: '',
          className: 'TextMessageTextpureText',
          text: '第一条消息',
        },
        {
          tagName: 'DIV',
          id: '',
          className: 'TextMessageTextpureText',
          text: '第二条消息',
        },
      ],
    })
  })

  it('collects likely page-level candidates when the chat selectors are missing', () => {
    const textNode = {
      tagName: 'DIV',
      id: '',
      className: 'TextMessageTextpureText',
      textContent: '测试消息',
      getAttribute(name: string) {
        return name === 'data-e2e' ? 'msg-item-content' : null
      },
    }
    const chatRoot = {
      tagName: 'DIV',
      id: 'messageContent',
      className: 'conversation-shell',
      textContent: '会话容器',
      getAttribute(name: string) {
        return name === 'data-mask' ? 'conversaton-detail-content' : null
      },
    }
    const documentLike = {
      querySelector() {
        return null
      },
      querySelectorAll(selector: string) {
        return selector === '*' ? [chatRoot, textNode] : []
      },
    }

    expect(collectDouyinPageProbe(documentLike)).toEqual([
      {
        tagName: 'DIV',
        id: 'messageContent',
        className: 'conversation-shell',
        text: '会话容器',
        dataE2e: '',
        dataMask: 'conversaton-detail-content',
      },
      {
        tagName: 'DIV',
        id: '',
        className: 'TextMessageTextpureText',
        text: '测试消息',
        dataE2e: 'msg-item-content',
        dataMask: '',
      },
    ])
  })

  it('collects a document skeleton when the page probe is empty', () => {
    const appNode = {
      tagName: 'DIV',
      id: 'root',
      className: 'app-shell',
      textContent: '首页内容',
      getAttribute() {
        return null
      },
      outerHTML: '<div id="root" class="app-shell">首页内容</div>',
    }
    const bodyNode = {
      tagName: 'BODY',
      id: '',
      className: '',
      textContent: '首页内容',
      children: [appNode],
      outerHTML: '<body><div id="root" class="app-shell">首页内容</div></body>',
    }
    const htmlNode = {
      tagName: 'HTML',
      id: '',
      className: '',
      textContent: '首页内容',
      children: [bodyNode],
      outerHTML: '<html><body><div id="root" class="app-shell">首页内容</div></body></html>',
    }
    const documentLike = {
      readyState: 'complete',
      title: '抖音',
      location: { href: 'https://www.douyin.com/' },
      body: bodyNode,
      documentElement: htmlNode,
    }

    expect(collectDouyinDocumentSkeleton(documentLike)).toEqual({
      readyState: 'complete',
      title: '抖音',
      href: 'https://www.douyin.com/',
      documentText: '首页内容',
      html: {
        tagName: 'HTML',
        id: '',
        className: '',
        text: '首页内容',
      },
      body: {
        tagName: 'BODY',
        id: '',
        className: '',
        text: '首页内容',
      },
      bodyChildren: [
        {
          tagName: 'DIV',
          id: 'root',
          className: 'app-shell',
          text: '首页内容',
        },
      ],
      htmlPreview: '<html><body><div id="root" class="app-shell">首页内容</div></body></html>',
      bodyPreview: '<body><div id="root" class="app-shell">首页内容</div></body>',
    })
  })
})
