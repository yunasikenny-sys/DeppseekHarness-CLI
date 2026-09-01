# DSH Desktop

Minimal Electron shell for the published DeepSeek Harness runtime. End users do not need to install Node.js, pnpm, or dsh.

## Verification ladder

```sh
npm install
npm run verify
npm start
npm run pack
npm run dist:win
```

Each command proves one additional layer:

1. `verify` checks the URL parser and starts the installed dsh CLI far enough to read its version.
2. `start` runs Electron and starts `dsh web` on an OS-assigned loopback port.
3. `pack` creates an unpacked app for the current platform.
4. `dist:win` creates Windows NSIS and portable targets.

Windows artifacts are produced most reliably by `.github/workflows/windows-build.yml`, because dsh includes native dependencies such as `node-pty`.

## Runtime behavior

- Electron starts its own executable in Node mode as the dsh child process.
- dsh binds only to `127.0.0.1` on an OS-assigned port.
- Electron waits for dsh's loopback startup URL.
- Harness state is stored below Electron's per-user application-data directory.
- Closing Electron terminates the dsh process tree.

## Distribution checklist

- Replace the example `appId` and product name.
- Add application icons.
- Add Windows code signing.
- Review and ship all third-party notices.
- Test the installer in a clean Windows virtual machine.
- Keep DeepSeek Harness pinned until a release is validated.
