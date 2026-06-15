import esbuild from 'esbuild'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const outdir = path.resolve(projectRoot, 'electron-dist')
const watchMode = process.argv.includes('--watch')

await mkdir(path.resolve(outdir, 'platform-preload'), { recursive: true })

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
  absWorkingDir: projectRoot,
}

const buildConfigs = [
  {
    entryPoints: ['electron/main.ts'],
    outfile: 'electron-dist/main.cjs',
  },
  {
    entryPoints: ['electron/preload.ts'],
    outfile: 'electron-dist/preload.cjs',
  },
  {
    entryPoints: ['electron/platform-preload/douyin.ts'],
    outfile: 'electron-dist/platform-preload/douyin.cjs',
  },
  {
    entryPoints: ['electron/platform-preload/whatsapp.ts'],
    outfile: 'electron-dist/platform-preload/whatsapp.cjs',
  },
  {
    entryPoints: ['electron/platform-preload/telegram.ts'],
    outfile: 'electron-dist/platform-preload/telegram.cjs',
  },
  {
    entryPoints: ['electron/platform-preload/telegramk.ts'],
    outfile: 'electron-dist/platform-preload/telegramk.cjs',
  },
]

if (watchMode) {
  await Promise.all(
    buildConfigs.map(async (config) => {
      const context = await esbuild.context({
        ...shared,
        ...config,
      })
      await context.watch()
    }),
  )
} else {
  await Promise.all(
    buildConfigs.map((config) =>
      esbuild.build({
        ...shared,
        ...config,
      })),
  )
}
