import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const loginPagePath = path.resolve(__dirname, '../app/login/page.tsx')
const loginPageSource = readFileSync(loginPagePath, 'utf8')

test('create-account CTA routes to /signup', () => {
  assert.match(loginPageSource, /Create Account with Email \+ Password/)
  assert.match(loginPageSource, /onClick=\{\(\) => router\.push\('\/signup'\)\}/)
})
