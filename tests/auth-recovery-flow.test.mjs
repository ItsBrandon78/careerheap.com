import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function read(relativePath) {
  return readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8')
}

test('layout mounts auth recovery handler globally', () => {
  const layout = read('app/layout.tsx')
  assert.match(layout, /import AuthRecoveryHandler from ['"]@\/components\/AuthRecoveryHandler['"]/)
  assert.match(layout, /<AuthRecoveryHandler \/>/)
})

test('auth recovery handler promotes hash recovery links into reset password flow', () => {
  const handler = read('components/AuthRecoveryHandler.tsx')
  assert.match(handler, /new URLSearchParams\(hash\.slice\(1\)\)/)
  assert.match(handler, /safeSearchParams/)
  assert.match(handler, /type !== 'recovery'/)
  assert.match(handler, /supabase\.auth\.setSession/)
  assert.match(handler, /window\.location\.replace\('\/reset-password'\)/)
})
