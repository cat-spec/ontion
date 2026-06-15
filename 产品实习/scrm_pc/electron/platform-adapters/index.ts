import type { PlatformId } from '../../src/platform/contracts'
import { douyinChatAdapter } from './douyin'
import { telegramChatAdapter } from './telegram'
import { telegramKChatAdapter } from './telegramk'
import type { PlatformAdapter } from './types'
import { whatsappChatAdapter } from './whatsapp'

// 平台适配器注册表，只保留当前已实现的平台。
const adapters: Record<PlatformId, PlatformAdapter | null> = {
  douyin: douyinChatAdapter,
  whatsapp: whatsappChatAdapter,
  telegram: telegramChatAdapter,
  telegramk: telegramKChatAdapter,
}

// 主进程通过这个函数获取平台能力，避免在容器管理代码里写平台分支。
export function getPlatformAdapter(platformId: PlatformId) {
  return adapters[platformId]
}

// 导出具体 adapter 便于测试或后续平台能力复用。
export { douyinChatAdapter }
export { telegramChatAdapter, telegramKChatAdapter, whatsappChatAdapter }
