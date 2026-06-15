import type { PlatformCaptureEvent, RawPlatformCaptureEvent } from '../../src/platform/contracts'
import type { PlatformAdapter } from './types'

// guest preload 理论上会生成 messageKey；这里保留兜底，避免异常事件无法进入时间线。
function buildFallbackMessageKey(event: RawPlatformCaptureEvent) {
  return `${event.direction}:${event.conversationKey ?? 'unknown'}:${event.timestamp}:${event.text.trim()}`
}

// 抖音平台适配器：主进程用它决定入口 URL、允许域名、平台 preload 和事件标准化方式。
export const douyinChatAdapter: PlatformAdapter = {
  id: 'douyin',
  entryUrl: 'https://www.douyin.com',
  allowedHosts: ['imdesktop.douyin.com', 'www.douyin.com'],
  preloadEntry: 'douyin.cjs',
  // 当前配置主要用于记录和后续扩展；实际 MVP DOM 选择器在 douyin preload 内固定。
  createPreloadConfig() {
    return {
      platformId: 'douyin',
      conversationSelectors: [
        '[data-e2e="im-message-list"]',
        '[class*="message-list"]',
      ],
      qrSelectors: [
        'canvas',
        'img[alt*="二维码"]',
        '[class*="qrcode"]',
      ],
    }
  },
  // 将 guest preload 发来的原始事件补齐 platformId、conversationKey、messageKey 等标准字段。
  normalizeEvent(event: RawPlatformCaptureEvent): PlatformCaptureEvent {
    return {
      platformId: 'douyin',
      sessionId: event.sessionId,
      direction: event.direction,
      conversationKey: event.conversationKey ?? 'unknown',
      messageKey: event.messageKey?.trim() || buildFallbackMessageKey(event),
      text: event.text.trim(),
      timestamp: event.timestamp,
      rawMeta: event.rawMeta ?? {},
    }
  },
  // 平台级登录态检测的兜底实现；当前实时状态主要由 douyin.ts preload 上报。
  detectLoginState(document: Document) {
    if (document.location.host === 'imdesktop.douyin.com') {
      return 'idle'
    }
    if (document.querySelector('[data-e2e="im-message-list"], [class*="message-list"]')) {
      return 'logged_in'
    }
    if (document.querySelector('canvas, img[alt*="二维码"], [class*="qrcode"]')) {
      return 'qr_required'
    }
    if (document.readyState !== 'complete') {
      return 'loading'
    }
    return 'idle'
  },
  // 识别当前选中的会话名称，识别不到时由标准事件使用 unknown。
  detectConversation(document: Document) {
    const target = document.querySelector('[data-e2e="conversation-active"], [class*="conversation"][class*="active"]')
    return target?.textContent?.trim() || null
  },
  // 主进程导航白名单：只允许 http/https 且 host 在 allowedHosts 内，拦截 bytedance:// 等外部协议。
  isUrlAllowed(url: string) {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false
      }
      return this.allowedHosts.includes(parsed.host)
    } catch {
      return false
    }
  },
}
