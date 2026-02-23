import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const toolTemplatePath = path.resolve(__dirname, '../app/tools/[slug]/page.tsx')
const source = readFileSync(toolTemplatePath, 'utf8')

test('generic tool template supports locked query-state rendering', () => {
  assert.match(source, /searchParams\.get\('locked'\)\s*===\s*'1'/)
  assert.match(source, /<PaywallBanner usesRemaining=\{0\} \/>/)
})
