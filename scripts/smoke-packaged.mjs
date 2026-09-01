import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { waitForReadyUrl } from '../src/runtime.mjs'

const [executable, appDirectory] = process.argv.slice(2)
if (!executable || !appDirectory) throw new Error('usage: smoke-packaged <executable> <app-directory>')

const packageDirectory = join(appDirectory, 'node_modules', '@deepseek-ai', 'dsh')
const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))
const bin = join(packageDirectory, manifest.bin.dsh)
const smokeHome = await mkdtemp(join(tmpdir(), 'dsh-packaged-smoke-'))
const child = spawn(executable, ['--expose-internals', bin, 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
  env: { ...process.env, DSH_HOME: smokeHome, ELECTRON_RUN_AS_NODE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

try {
  const url = await waitForReadyUrl(child)
  const response = await fetch(url, { redirect: 'manual' })
  if (!response.ok && !(response.status >= 300 && response.status < 400)) {
    throw new Error(`Packaged DSH returned HTTP ${String(response.status)}`)
  }
  process.stdout.write(`Verified packaged dsh web at ${new URL(url).origin}\n`)
} finally {
  child.kill('SIGTERM')
  await rm(smokeHome, { recursive: true, force: true })
}
