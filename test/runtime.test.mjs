import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseReadyUrl } from '../src/runtime.mjs'

test('parses the authenticated loopback startup URL', () => {
  assert.equal(
    parseReadyUrl('dsh web: http://127.0.0.1:41234/?token=secret-token'),
    'http://127.0.0.1:41234/?token=secret-token',
  )
})

test('rejects non-loopback and unauthenticated URLs', () => {
  assert.equal(parseReadyUrl('dsh web: http://example.com/?token=secret'), undefined)
  assert.equal(parseReadyUrl('dsh web: http://127.0.0.1:41234/'), undefined)
  assert.equal(parseReadyUrl('unrelated output'), undefined)
})
