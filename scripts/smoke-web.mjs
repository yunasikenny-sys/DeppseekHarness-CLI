import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import electronPath from 'electron'

import { waitForReadyUrl } from '../src/runtime.mjs'

const packageDirectory = join(import.meta.dirname, '..', 'node_modules', '@deepseek-ai', 'dsh')
const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))
const bin = join(packageDirectory, manifest.bin.dsh)
const smokeHome = await mkdtemp(join(tmpdir(), 'dsh-electron-smoke-'))
const child = spawn(electronPath, ['--expose-internals', bin, 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
  cwd: dirname(import.meta.dirname),
  env: {
    ...process.env,
    DSH_HOME: smokeHome,
    ELECTRON_RUN_AS_NODE: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

async function fetchReady(url) {
  let lastError
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.ok || (response.status >= 300 && response.status < 400 && response.headers.has('set-cookie'))) {
        return response
      }
      lastError = new Error(`DSH returned HTTP ${String(response.status)}`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw lastError
}

try {
  const url = await waitForReadyUrl(child)
  await fetchReady(url)
  process.stdout.write(`Verified Electron-hosted dsh web at ${new URL(url).origin}\n`)
} finally {
  child.kill('SIGTERM')
  await rm(smokeHome, { recursive: true, force: true })
}
