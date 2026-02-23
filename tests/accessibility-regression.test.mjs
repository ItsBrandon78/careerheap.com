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

test('root layout includes skip link and keyboard target main landmark', () => {
  const layout = read('app/layout.tsx')
  assert.match(layout, /href="#main-content"/)
  assert.match(layout, /id="main-content"/)
  assert.match(layout, /tabIndex=\{-1\}/)
})

test('auth pages expose aria-live status feedback for async messages', () => {
  const login = read('app/login/page.tsx')
  const signup = read('app/signup/page.tsx')
  const forgot = read('app/forgot-password/page.tsx')
  const reset = read('app/reset-password/page.tsx')

  assert.match(login, /aria-live="polite"/)
  assert.match(signup, /aria-live="polite"/)
  assert.match(forgot, /aria-live="polite"/)
  assert.match(reset, /aria-live="polite"/)
})

test('blog card image in linked card is decorative to avoid duplicate announcement', () => {
  const featuredCard = read('components/blog/FeaturedPostCard.tsx')
  assert.match(featuredCard, /alt=""/)
  assert.match(featuredCard, /aria-hidden="true"/)
})

test('blog post images keep meaningful fallback alt text', () => {
  const blogPostPage = read('app/blog/[slug]/page.tsx')
  const sanityPostPage = read('app/sanity-posts/[slug]/page.tsx')

  assert.match(blogPostPage, /cover illustration/)
  assert.match(sanityPostPage, /cover illustration/)
})
