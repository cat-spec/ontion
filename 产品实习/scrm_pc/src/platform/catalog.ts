import type { PlatformId } from './contracts'

export interface PlatformTargetConfig {
  id: PlatformId
  titlePrefix: string
  entryUrl: string
  allowedHosts: string[]
  supported: boolean
}

export const platformTargetCatalog: Record<PlatformId, PlatformTargetConfig> = {
  douyin: {
    id: 'douyin',
    titlePrefix: '抖音聊天',
    entryUrl: 'https://www.douyin.com/',
    allowedHosts: ['imdesktop.douyin.com', 'www.douyin.com'],
    supported: true,
  },
  whatsapp: {
    id: 'whatsapp',
    titlePrefix: 'WhatsApp',
    entryUrl: 'https://web.whatsapp.com/',
    allowedHosts: ['web.whatsapp.com'],
    supported: true,
  },
  telegram: {
    id: 'telegram',
    titlePrefix: 'Telegram',
    entryUrl: 'https://web.telegram.org/a/',
    allowedHosts: ['web.telegram.org'],
    supported: true,
  },
  telegramk: {
    id: 'telegramk',
    titlePrefix: 'TelegramK',
    entryUrl: 'https://web.telegram.org/k/',
    allowedHosts: ['web.telegram.org'],
    supported: true,
  },
}

export function getPlatformTarget(platformId: PlatformId) {
  return platformTargetCatalog[platformId]
}
