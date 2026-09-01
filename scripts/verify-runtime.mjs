import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const packagePath = require.resolve('@deepseek-ai/dsh/package.json')
const manifest = require(packagePath)
const bin = join(dirname(packagePath), manifest.bin.dsh)
const result = spawnSync(process.execPath, [bin, '--version'], { encoding: 'utf8' })

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout)
  process.exit(result.status ?? 1)
}

process.stdout.write(`Verified dsh ${result.stdout.trim()}\n`)
