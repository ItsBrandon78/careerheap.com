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

test('forgot-password maps Supabase rate limits to actionable feedback', () => {
  const forgot = read('app/forgot-password/page.tsx')
  assert.match(forgot, /formatResetError/)
  assert.match(forgot, /Too many reset requests\. Wait about a minute, then try again\./)
  assert.match(forgot, /Try again in \$\{retryAfterSeconds\}s/)
  assert.match(forgot, /disabled=\{retryAfterSeconds > 0\}/)
  assert.match(forgot, /redirect url\.\*not allowed/i)
  assert.match(forgot, /Network error\. Check your connection and try again\./)
})
