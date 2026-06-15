import type { PlatformBridgeApi } from '@/platform/contracts'

declare global {
  interface Window {
    electronPlatform?: PlatformBridgeApi
  }
}

export {}
