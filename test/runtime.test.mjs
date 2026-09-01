import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseReadyUrl } from '../src/runtime.mjs'

test('parses the loopback startup URL', () => {
  assert.equal(
    parseReadyUrl('dsh web: http://127.0.0.1:41234'),
    'http://127.0.0.1:41234/',
  )
})

test('parses a URL with a LAN suffix', () => {
  assert.equal(
    parseReadyUrl('dsh web: http://127.0.0.1:41234 (LAN: http://192.168.1.5:41234)'),
    'http://127.0.0.1:41234/',
  )
})

test('accepts localhost as a loopback host', () => {
  assert.equal(
    parseReadyUrl('dsh web: http://localhost:41234'),
    'http://localhost:41234/',
  )
})

test('rejects non-loopback and non-http URLs', () => {
  assert.equal(parseReadyUrl('dsh web: http://example.com'), undefined)
  assert.equal(parseReadyUrl('dsh web: https://127.0.0.1:41234'), undefined)
  assert.equal(parseReadyUrl('unrelated output'), undefined)
})

test('ignores the non-URL "dsh web:" announcement lines', () => {
  assert.equal(parseReadyUrl('dsh web: opening the default browser; pass --no-open to disable'), undefined)
})
