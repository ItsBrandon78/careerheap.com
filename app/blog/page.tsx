import type { Metadata } from 'next'
import PageHero from '@/components/PageHero'
import BlogIndexFiltered from '@/components/blog/BlogIndexFiltered'
import { getDefaultOgImageUrl, getSiteBaseUrl } from '@/lib/blog/utils'
import { getAllBlogPosts, getBlogCategories } from '@/lib/sanity/api'
import { getBlogPopularityMap } from '@/lib/server/blogViews'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'CareerHeap Blog | Career Switch Guides and Resume Tactics',
  description: 'Practical guides, career switch playbooks, and resume tactics that actually work.',
  alternates: { canonical: `${getSiteBaseUrl()}/blog` },
  openGraph: {
    title: 'CareerHeap Blog',
    description: 'Practical guides, career switch playbooks, and resume tactics that actually work.',
    url: `${getSiteBaseUrl()}/blog`,
    type: 'website',
    images: [{ url: getDefaultOgImageUrl(), alt: 'CareerHeap Blog' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerHeap Blog',
    description: 'Practical guides, career switch playbooks, and resume tactics that actually work.',
    images: [getDefaultOgImageUrl()]
  }
}

export default async function BlogPage() {
  const [posts, categories, popularityMap] = await Promise.all([
    getAllBlogPosts(),
    getBlogCategories(),
    getBlogPopularityMap(30)
  ])

  const postsWithPopularity = posts.map((post) => ({
    ...post,
    popularityScore: popularityMap[post.slug] ?? 0
  }))

  return (
    <>
      <PageHero
        badge="From the blog"
        title="Career insights that respect your time"
        sub="Practical, honest advice for starting out and switching lanes — no fluff, no gatekeeping."
      />

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 72 }}>
        <BlogIndexFiltered posts={postsWithPopularity} categories={categories} />
      </section>
    </>
  )
}
