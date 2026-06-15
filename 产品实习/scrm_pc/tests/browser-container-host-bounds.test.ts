import { describe, expect, it } from 'vitest'
import { buildHiddenContainerBounds } from '@/platform/container-bounds'

describe('browser container host bounds', () => {
  it('reports the active session as hidden when the host unmounts', () => {
    expect(buildHiddenContainerBounds('douyin-0001')).toEqual({
      sessionId: 'douyin-0001',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: false,
    })
  })
})
