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

test('auth redirect prefers current browser origin to avoid www/non-www mismatches', () => {
  const source = read('lib/supabase/authRedirect.ts')
  assert.match(
    source,
    /if \(typeof window !== 'undefined' && window\.location\?\.origin\) \{\s*return window\.location\.origin\s*\}/
  )
})
