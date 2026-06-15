import type { PlatformCaptureEvent, PlatformId, RawPlatformCaptureEvent } from '../../src/platform/contracts'

// 平台适配器定义多平台接入的最小契约。
// 主进程只依赖这个接口，不直接写死抖音逻辑，后续接 WhatsApp/Telegram 时新增 adapter 即可。
export interface PlatformAdapter {
  // 平台唯一标识，对应 renderer/store 中的 PlatformId。
  id: PlatformId
  // WebContentsView 首次打开的入口地址。
  entryUrl: string
  // 容器允许导航的域名白名单。
  allowedHosts: string[]
  // 编译后的 guest preload 文件名，例如 platform-preload/douyin.cjs。
  preloadEntry: string
  // 预留：后续可把平台选择器、特性开关等配置传给 preload。
  createPreloadConfig(): Record<string, unknown>
  // guest preload 上报的是 RawPlatformCaptureEvent，主进程在这里补齐平台标准事件结构。
  normalizeEvent(event: RawPlatformCaptureEvent): PlatformCaptureEvent
  // 预留：平台级登录态检测接口；当前主要由 guest preload 上报状态。
  detectLoginState(document: Document): 'idle' | 'loading' | 'qr_required' | 'logged_in' | 'error'
  // 预留：平台级当前会话识别接口。
  detectConversation(document: Document): string | null
  // 主进程导航白名单检查入口。
  isUrlAllowed(url: string): boolean
}
