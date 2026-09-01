import { createInterface } from 'node:readline'

const READY_PREFIX = 'dsh web: '

/** Loopback hostnames the Electron shell is willing to load. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost'])

/**
 * Extract the loopback URL printed by dsh web.
 *
 * The real ready line looks like `dsh web: http://127.0.0.1:41234` and may be
 * followed by a ` (LAN: http://...)` suffix. The loopback web server has no
 * authentication, so there is no `?token=` query parameter.
 * @param {string} line One line of process output.
 * @returns {string | undefined} The loopback URL when this is the ready line.
 */
export function parseReadyUrl(line) {
  if (!line.startsWith(READY_PREFIX)) return undefined

  const candidate = line.slice(READY_PREFIX.length).split(' ')[0]

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)) return undefined
    return url.href
  } catch {
    return undefined
  }
}

/**
 * Wait for dsh to print its loopback startup URL.
 * @param {import('node:child_process').ChildProcess} child Running dsh process.
 * @param {number} timeoutMs Maximum startup time.
 * @returns {Promise<string>} The loopback URL to load in the window.
 */
export function waitForReadyUrl(child, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    if (!child.stdout || !child.stderr) {
      reject(new Error('DSH process output is unavailable'))
      return
    }

    const stdout = createInterface({ input: child.stdout })
    const stderr = createInterface({ input: child.stderr })
    const errors = []
    let settled = false

    const cleanup = () => {
      clearTimeout(timer)
      stdout.close()
      stderr.close()
      child.off('error', onError)
      child.off('exit', onExit)
    }

    const succeed = (url) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(url)
    }

    const fail = (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const onError = (error) => fail(error)
    const onExit = (code, signal) => {
      const detail = errors.slice(-10).join('\n')
      fail(new Error(`DSH exited before startup (code=${String(code)}, signal=${String(signal)})${detail ? `\n${detail}` : ''}`))
    }

    stdout.on('line', (line) => {
      const url = parseReadyUrl(line)
      if (url) succeed(url)
    })
    stderr.on('line', line => errors.push(line))
    child.once('error', onError)
    child.once('exit', onExit)

    const timer = setTimeout(() => {
      const detail = errors.slice(-10).join('\n')
      fail(new Error(`DSH did not start within ${String(timeoutMs)} ms${detail ? `\n${detail}` : ''}`))
    }, timeoutMs)
  })
}
