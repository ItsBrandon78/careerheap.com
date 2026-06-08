'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import BlogCover from '@/components/blog/BlogCover'
import { Icon } from '@/components/ui/Icon'
import { formatPublishedDate, toReadTimeLabel } from '@/lib/blog/utils'
import type { BlogCategory, BlogPostSummary } from '@/lib/blog/types'

const teal = 'inline-flex w-fit items-center rounded-pill bg-[#e3f7f6] px-2.5 py-1 text-[12px] font-semibold text-[#0a7f7e]'
const neutral = 'inline-flex w-fit items-center rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary'

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'border border-border bg-surface text-text-secondary hover:border-accent hover:text-accent'
      }`}
    >
      {children}
    </button>
  )
}

export default function BlogIndexFiltered({
  posts,
  categories
}: {
  posts: BlogPostSummary[]
  categories: BlogCategory[]
}) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'newest' | 'popular'>('newest')

  const effectiveSort: 'newest' | 'popular' = sort

  // Chips reflect real content: Sanity category docs merged with every category
  // actually used by a post (so categories on posts always surface as a tag).
  const displayCategories = useMemo(() => {
    const bySlug = new Map<string, BlogCategory>()
    for (const c of categories) bySlug.set(c.slug, c)
    for (const p of posts) {
      if (p.category?.slug && !bySlug.has(p.category.slug)) bySlug.set(p.category.slug, p.category)
    }
    return Array.from(bySlug.values())
  }, [categories, posts])

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(id)
  }, [search])

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    const matches = posts.filter((post) => {
      const categoryMatch = category === 'all' || post.category.slug === category
      const target = `${post.title} ${post.excerpt} ${post.category.title}`.toLowerCase()
      const searchMatch = q.length === 0 || target.includes(q)
      return categoryMatch && searchMatch
    })

    return [...matches].sort((a, b) => {
      if (effectiveSort === 'popular' && b.popularityScore !== a.popularityScore) {
        return b.popularityScore - a.popularityScore
      }
      const byDate = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug)
    })
  }, [posts, debounced, category, effectiveSort])

  // Featured hero only on the default All + Latest view (matches prototype).
  const showFeatured = category === 'all' && effectiveSort === 'newest' && debounced.trim() === ''
  const featured = showFeatured ? filtered[0] ?? null : null
  const grid = featured ? filtered.slice(1) : filtered
  const isDatasetEmpty = posts.length === 0

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setSort('newest')
  }

  return (
    <div className="flex flex-col gap-8">
      {/* filter bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            All
          </Chip>
          {displayCategories.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.title}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              aria-label="Search articles"
              className="w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none sm:w-[240px]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-surface p-[3px]">
            {([['newest', 'Latest'], ['popular', 'Popular']] as const).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-pill px-3.5 py-[7px] text-[13px] font-semibold transition-colors ${
                  sort === s ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border-light bg-surface px-6 py-12 text-center shadow-card">
          <h3 className="text-xl font-bold text-text-primary">
            {isDatasetEmpty ? 'No posts yet — coming this week' : 'No posts found'}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {isDatasetEmpty
              ? "We're publishing practical career guides soon."
              : 'Try another search or clear your filters.'}
          </p>
          {!isDatasetEmpty && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="grid overflow-hidden rounded-lg border border-border-light bg-surface shadow-card transition-shadow hover:shadow-panel md:grid-cols-2"
            >
              <BlogCover category={featured.category.title} imageUrl={featured.coverImage?.url ?? null} height={280} />
              <div className="p-9">
                <span className={teal}>{featured.category.title}</span>
                <h2 className="mt-3.5 text-[25px] font-extrabold leading-[1.2]">{featured.title}</h2>
                <p className="mt-3 text-[15px] leading-[1.65] text-text-secondary">{featured.excerpt}</p>
                <div className="mt-[18px] flex flex-wrap gap-3 text-[13px] text-text-tertiary">
                  <span>{featured.authorName}</span>
                  <span>·</span>
                  <span>{formatPublishedDate(featured.publishedAt)}</span>
                  <span>·</span>
                  <span>{toReadTimeLabel(featured.readTimeMinutes)}</span>
                </div>
              </div>
            </Link>
          )}

          {grid.length > 0 && (
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-border-light bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-panel"
                >
                  <BlogCover category={p.category.title} imageUrl={p.coverImage?.url ?? null} height={150} />
                  <div className="flex flex-1 flex-col p-5">
                    <span className={neutral}>{p.category.title}</span>
                    <h3 className="mt-3 text-[16.5px] font-bold leading-[1.3]">{p.title}</h3>
                    <p className="mt-2 flex-1 text-[13.5px] leading-[1.6] text-text-secondary">
                      {p.excerpt.length > 96 ? `${p.excerpt.slice(0, 96)}…` : p.excerpt}
                    </p>
                    <div className="mt-3.5 flex items-center gap-2 text-[12px] text-text-tertiary">
                      <span>{formatPublishedDate(p.publishedAt)}</span>
                      <span>·</span>
                      <span>{toReadTimeLabel(p.readTimeMinutes)}</span>
                      {effectiveSort === 'popular' && p.popularityScore > 0 && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="trending" size={12} />
                            {p.popularityScore >= 1000
                              ? `${(p.popularityScore / 1000).toFixed(1)}k`
                              : p.popularityScore}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
