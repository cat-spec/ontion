import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('desktop packaging config', () => {
  it('uses file-url-safe asset paths and routing for packaged Electron builds', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8')
    const routerConfig = readFileSync('src/router/index.ts', 'utf8')

    expect(viteConfig).toContain("base: './'")
    expect(routerConfig).toContain('createWebHashHistory')
    expect(routerConfig).not.toContain('createWebHistory')
  })
})
