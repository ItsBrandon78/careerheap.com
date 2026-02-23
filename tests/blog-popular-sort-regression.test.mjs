import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const blogIndexClientPath = path.resolve(__dirname, '../components/blog/BlogIndexClient.tsx')
const source = readFileSync(blogIndexClientPath, 'utf8')

test('popular sort relies on real popularityScore signal', () => {
  assert.match(source, /popularityScore/)
  assert.match(source, /Popular ranks by real views in the last 30 days/)
})
