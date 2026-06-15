import type { PlatformId } from '../../src/platform/contracts'
import { douyinChatAdapter } from './douyin'
import type { PlatformAdapter } from './types'

// 平台适配器注册表。
// 目前只有抖音真正实现，其他平台先保留 null，renderer 可以展示入口但主进程不会创建容器。
const adapters: Record<PlatformId, PlatformAdapter | null> = {
  douyin: douyinChatAdapter,
  whatsapp: null,
  telegram: null,
  line: null,
  instagram: null,
  messenger: null,
  facebook: null,
  x: null,
  zalo: null,
}

// 主进程通过这个函数获取平台能力，避免在容器管理代码里写平台分支。
export function getPlatformAdapter(platformId: PlatformId) {
  return adapters[platformId]
}

// 导出具体 adapter 便于测试或后续平台能力复用。
export { douyinChatAdapter }
