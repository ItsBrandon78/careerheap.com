import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const apiSource = readFileSync(path.resolve(__dirname, '../lib/sanity/api.ts'), 'utf8')
const postCardSource = readFileSync(path.resolve(__dirname, '../components/blog/PostCard.tsx'), 'utf8')
const featuredSource = readFileSync(path.resolve(__dirname, '../components/blog/FeaturedPostCard.tsx'), 'utf8')
const detailSource = readFileSync(path.resolve(__dirname, '../app/blog/[slug]/page.tsx'), 'utf8')

test('blog API maps Sanity cover image to typed coverImage contract', () => {
  assert.match(apiSource, /function buildCoverImage/)
  assert.match(apiSource, /BlogCoverImage/)
  assert.match(apiSource, /coverImage,/)
  assert.match(apiSource, /width/)
  assert.match(apiSource, /height/)
  assert.match(apiSource, /alt/)
})

test('blog UI uses deterministic no-cover state and not random placeholders', () => {
  assert.match(postCardSource, /NoCoverState/)
  assert.match(featuredSource, /NoCoverState/)
  assert.match(detailSource, /NoCoverState/)
  assert.doesNotMatch(apiSource, /unsplash|fallbackImages|picsum|ui-avatars|random/i)
})
