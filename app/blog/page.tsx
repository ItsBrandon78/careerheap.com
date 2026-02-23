import type { Metadata } from 'next'
import BlogHero from '@/components/blog/BlogHero'
import BlogIndexClient from '@/components/blog/BlogIndexClient'
import CTASection from '@/components/CTASection'
import { getDefaultOgImageUrl, getSiteBaseUrl } from '@/lib/blog/utils'
import { getAllBlogPosts, getBlogCategories } from '@/lib/sanity/api'
import { getBlogPopularityMap } from '@/lib/server/blogViews'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'CareerHeap Blog | Career Switch Guides and Resume Tactics',
  description:
    'Practical guides, career switch playbooks, and resume tactics that actually work.',
  alternates: {
    canonical: `${getSiteBaseUrl()}/blog`
  },
  openGraph: {
    title: 'CareerHeap Blog',
    description:
      'Practical guides, career switch playbooks, and resume tactics that actually work.',
    url: `${getSiteBaseUrl()}/blog`,
    type: 'website',
    images: [
      {
        url: getDefaultOgImageUrl(),
        alt: 'CareerHeap Blog'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerHeap Blog',
    description:
      'Practical guides, career switch playbooks, and resume tactics that actually work.',
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
      <BlogHero
        title="CareerHeap Blog"
        subtitle="Practical guides, career switch playbooks, and resume tactics that actually work."
      />

      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <BlogIndexClient posts={postsWithPopularity} categories={categories} />
        </div>
      </section>

      <CTASection
        title="Ready for a Personalized Career Plan?"
        subtitle="Move from reading to execution with the Career Switch Planner."
        primaryButtonText="Start My Career Plan"
        primaryHref="/tools/career-switch-planner"
      />
    </>
  )
}
