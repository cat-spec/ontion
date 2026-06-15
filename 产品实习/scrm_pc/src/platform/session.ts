import type { PlatformId, PlatformSessionRecord } from './contracts'
import { getPlatformTarget } from './catalog'

export function buildSessionDraft(input: {
  platformId: PlatformId
  sequence: number
}): PlatformSessionRecord {
  const target = getPlatformTarget(input.platformId)
  const id = `${input.platformId}-${String(input.sequence).padStart(4, '0')}`

  return {
    id,
    platformId: input.platformId,
    title: target.titlePrefix,
    partition: `persist:nexscrm:${input.platformId}:${id}`,
    entryUrl: target.entryUrl,
    loginState: 'idle',
    containerState: 'detached',
    captureState: 'idle',
    createdAt: Date.now(),
  }
}
