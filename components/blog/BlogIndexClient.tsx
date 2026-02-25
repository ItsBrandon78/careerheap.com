'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/Button'
import FeaturedPostCard from '@/components/blog/FeaturedPostCard'
import FilterRow from '@/components/blog/FilterRow'
import PostCard from '@/components/blog/PostCard'
import type { BlogCategory, BlogPostSummary } from '@/lib/blog/types'

interface BlogIndexClientProps {
  posts: BlogPostSummary[]
  categories: BlogCategory[]
}

export default function BlogIndexClient({ posts, categories }: BlogIndexClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest')
  const popularEnabled = useMemo(
    () => posts.some((post) => post.popularityScore > 0),
    [posts]
  )
  const effectiveSortBy: 'newest' | 'popular' = popularEnabled ? sortBy : 'newest'

  const displayCategories = useMemo<BlogCategory[]>(() => {
    const seeded: BlogCategory[] = [
      { slug: 'career-switch', title: 'Career Switch' },
      { slug: 'resume', title: 'Resume' }
    ]

    const bySlug = new Map<string, BlogCategory>()
    for (const item of seeded) {
      bySlug.set(item.slug, item)
    }
    for (const item of categories) {
      bySlug.set(item.slug, item)
    }

    return Array.from(bySlug.values())
  }, [categories])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchTerm])

  const filteredPosts = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase()

    const filtered = posts.filter((post) => {
      const categoryMatch =
        selectedCategory === 'all' || post.category.slug === selectedCategory

      const textTarget = `${post.title} ${post.excerpt} ${post.category.title}`.toLowerCase()
      const searchMatch =
        normalizedSearch.length === 0 || textTarget.includes(normalizedSearch)

      return categoryMatch && searchMatch
    })

    const sorted = [...filtered].sort((a, b) => {
      if (effectiveSortBy === 'popular' && popularEnabled) {
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore
        }

        const publishedDiff =
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        if (publishedDiff !== 0) {
          return publishedDiff
        }

        return a.slug.localeCompare(b.slug)
      }

      const publishedDiff =
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      if (publishedDiff !== 0) {
        return publishedDiff
      }

      return a.slug.localeCompare(b.slug)
    })

    return sorted
  }, [posts, debouncedSearchTerm, selectedCategory, effectiveSortBy, popularEnabled])

  const featuredPost = filteredPosts[0] || null
  const gridPosts = filteredPosts.slice(1)

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">Featured Post</h2>
        {featuredPost ? <FeaturedPostCard post={featuredPost} /> : null}
      </div>

      <FilterRow
        categories={displayCategories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={effectiveSortBy}
        onSortChange={setSortBy}
        popularEnabled={popularEnabled}
      />

      {filteredPosts.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary px-6 py-10 text-center">
          <h3 className="text-xl font-bold text-text-primary">No posts found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Try another search query or clear your selected filters.
          </p>
          <div className="mt-5">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSortBy('newest')
              }}
            >
              Clear Filters
            </Button>
          </div>
          <div className="mt-3">
            <Link
              href="/tools/career-switch-planner"
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Or jump to Career Switch Planner -&gt;
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-primary">Latest Posts</h2>
            {effectiveSortBy === 'popular' && popularEnabled ? (
              <p className="text-xs font-semibold text-text-tertiary">
                Popular ranks by real views in the last 30 days.
              </p>
            ) : !popularEnabled ? (
              <p className="text-xs font-semibold text-text-tertiary">
                Popular activates after the first tracked views.
              </p>
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(gridPosts.length > 0 ? gridPosts : featuredPost ? [featuredPost] : []).map(
              (post) => (
                <PostCard key={post.id} post={post} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
