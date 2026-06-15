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
    supported: false,
  },
  telegram: {
    id: 'telegram',
    titlePrefix: 'Telegram',
    entryUrl: 'https://web.telegram.org/',
    allowedHosts: ['web.telegram.org'],
    supported: false,
  },
  line: {
    id: 'line',
    titlePrefix: 'Line',
    entryUrl: 'https://line.me/',
    allowedHosts: ['line.me'],
    supported: false,
  },
  instagram: {
    id: 'instagram',
    titlePrefix: 'Instagram',
    entryUrl: 'https://www.instagram.com/direct/inbox/',
    allowedHosts: ['www.instagram.com'],
    supported: false,
  },
  messenger: {
    id: 'messenger',
    titlePrefix: 'Messenger',
    entryUrl: 'https://www.messenger.com/',
    allowedHosts: ['www.messenger.com'],
    supported: false,
  },
  facebook: {
    id: 'facebook',
    titlePrefix: 'Facebook',
    entryUrl: 'https://www.facebook.com/messages/',
    allowedHosts: ['www.facebook.com'],
    supported: false,
  },
  x: {
    id: 'x',
    titlePrefix: 'X',
    entryUrl: 'https://x.com/messages',
    allowedHosts: ['x.com'],
    supported: false,
  },
  zalo: {
    id: 'zalo',
    titlePrefix: 'Zalo',
    entryUrl: 'https://chat.zalo.me/',
    allowedHosts: ['chat.zalo.me'],
    supported: false,
  },
}

export function getPlatformTarget(platformId: PlatformId) {
  return platformTargetCatalog[platformId]
}
