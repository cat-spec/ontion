import type { PlatformCaptureEvent, PlatformId, RawPlatformCaptureEvent } from '../../src/platform/contracts'
import type { PlatformAdapter } from './types'

function buildFallbackMessageKey(event: RawPlatformCaptureEvent) {
  return `${event.direction}:${event.conversationKey ?? 'unknown'}:${event.timestamp}:${event.text.trim()}`
}

export function normalizePlatformEvent(platformId: PlatformId, event: RawPlatformCaptureEvent): PlatformCaptureEvent {
  return {
    platformId,
    sessionId: event.sessionId,
    direction: event.direction,
    conversationKey: event.conversationKey ?? 'unknown',
    messageKey: event.messageKey?.trim() || buildFallbackMessageKey(event),
    text: event.text.trim(),
    timestamp: event.timestamp,
    rawMeta: event.rawMeta ?? {},
  }
}

export function isAllowedHttpUrl(url: string, allowedHosts: string[]) {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    return allowedHosts.includes(parsed.host)
  } catch {
    return false
  }
}

export function createWebChatAdapter(input: {
  id: PlatformId
  entryUrl: string
  allowedHosts: string[]
  preloadEntry: string
  loggedInSelectors: string[]
  qrSelectors?: string[]
}): PlatformAdapter {
  return {
    id: input.id,
    entryUrl: input.entryUrl,
    allowedHosts: input.allowedHosts,
    preloadEntry: input.preloadEntry,
    createPreloadConfig() {
      return {
        platformId: input.id,
        loggedInSelectors: input.loggedInSelectors,
        qrSelectors: input.qrSelectors ?? [],
      }
    },
    normalizeEvent(event: RawPlatformCaptureEvent) {
      return normalizePlatformEvent(input.id, event)
    },
    detectLoginState(document: Document) {
      if (input.loggedInSelectors.some((selector) => document.querySelector(selector))) {
        return 'logged_in'
      }
      if (input.qrSelectors?.some((selector) => document.querySelector(selector))) {
        return 'qr_required'
      }
      if (document.readyState !== 'complete') {
        return 'loading'
      }
      return 'idle'
    },
    detectConversation(document: Document) {
      const target = document.querySelector('[aria-selected="true"], .active, [data-testid*="conversation"]')
      return target?.textContent?.trim() || null
    },
    isUrlAllowed(url: string) {
      return isAllowedHttpUrl(url, input.allowedHosts)
    },
  }
}
