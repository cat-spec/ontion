import type { PlatformContainerBounds } from './contracts'

export function buildHiddenContainerBounds(sessionId: string): PlatformContainerBounds {
  return {
    sessionId,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  }
}
