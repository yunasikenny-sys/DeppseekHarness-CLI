import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { app, BrowserWindow, dialog, shell } from 'electron'

import { waitForReadyUrl } from './runtime.mjs'

const sourceDirectory = dirname(fileURLToPath(import.meta.url))
let harnessProcess
let mainWindow
let quitting = false

function harnessBin() {
  const packageDirectory = join(sourceDirectory, '..', 'node_modules', '@deepseek-ai', 'dsh')
  const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'))
  return join(packageDirectory, manifest.bin.dsh)
}

function startHarness() {
  harnessProcess = spawn(
    process.execPath,
    ['--expose-internals', harnessBin(), 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'],
    {
      cwd: app.getPath('documents'),
      env: {
        ...process.env,
        DSH_HOME: join(app.getPath('userData'), 'dsh-home'),
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )

  return waitForReadyUrl(harnessProcess)
}

function stopHarness() {
  if (!harnessProcess || harnessProcess.killed) return

  if (process.platform === 'win32' && harnessProcess.pid) {
    spawnSync('taskkill', ['/pid', String(harnessProcess.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    harnessProcess.kill('SIGTERM')
  }
}

async function createWindow() {
  const readyUrl = await startHarness()
  const allowedOrigin = new URL(readyUrl).origin
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)
    if (target.protocol === 'https:' || target.protocol === 'http:') void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== allowedOrigin) event.preventDefault()
  })

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  await mainWindow.loadURL(readyUrl)
  mainWindow.show()
  mainWindow.focus()
}

const firstInstance = app.requestSingleInstanceLock()
if (!firstInstance) app.quit()

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
})

app.whenReady().then(createWindow).catch(async (error) => {
  await dialog.showMessageBox({
    type: 'error',
    title: 'DSH Desktop failed to start',
    message: 'DeepSeek Harness could not be started.',
    detail: error instanceof Error ? error.message : String(error),
  })
  app.quit()
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  if (quitting) return
  quitting = true
  stopHarness()
})
