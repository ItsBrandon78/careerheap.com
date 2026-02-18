import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'
import { notFound } from 'next/navigation'
import Button from '@/components/Button'
import ContentTypography from '@/components/blog/ContentTypography'
import InlineCTA from '@/components/blog/InlineCTA'
import PostMetaRow from '@/components/blog/PostMetaRow'
import RelatedPostsGrid from '@/components/blog/RelatedPostsGrid'
import { portableTextComponents } from '@/components/blog/portableTextComponents'
import ToolCard from '@/components/ToolCard'
import { getDefaultOgImageUrl, getSiteBaseUrl } from '@/lib/blog/utils'
import {
  getBlogPostBySlug,
  getBlogSlugs,
  getRelatedBlogPosts
} from '@/lib/sanity/api'

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export const revalidate = 120

export async function generateStaticParams() {
  const slugs = await getBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found | CareerHeap Blog'
    }
  }

  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt
  const canonical = `${getSiteBaseUrl()}/blog/${post.slug}`
  const ogImage = post.coverImageUrl || getDefaultOgImageUrl()

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      publishedTime: post.publishedAt,
      images: [
        {
          url: ogImage,
          alt: post.coverImageAlt || post.title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage]
    }
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedBlogPosts({
    postId: post.id,
    categorySlug: post.category.slug,
    limit: 3
  })
  const canonicalUrl = `${getSiteBaseUrl()}/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.authorName
    },
    image: post.coverImageUrl || getDefaultOgImageUrl(),
    mainEntityOfPage: canonicalUrl,
    description: post.seoDescription || post.excerpt
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col gap-6">
          <span className="w-fit rounded-pill border border-accent/20 bg-accent-light px-3 py-1 text-xs font-semibold tracking-[0.5px] text-accent">
            {post.category.title.toUpperCase()}
          </span>

          <h1 className="max-w-[820px] text-[34px] font-bold leading-[1.15] text-text-primary md:text-[40px]">
            {post.title}
          </h1>

          <PostMetaRow
            authorName={post.authorName}
            publishedAt={post.publishedAt}
            readTimeMinutes={post.readTimeMinutes}
          />

          <div className="relative h-[220px] w-full overflow-hidden rounded-lg bg-accent-light md:h-[420px]">
            {post.coverImageUrl ? (
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1280px) 100vw, 1100px"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col gap-8 lg:flex-row lg:items-start">
          <article className="w-full max-w-tool space-y-8">
            {post.excerpt ? (
              <p className="text-[17px] leading-[1.8] text-text-secondary">
                {post.excerpt}
              </p>
            ) : null}

            <InlineCTA />

            <ContentTypography>
              <PortableText value={post.body} components={portableTextComponents} />
            </ContentTypography>
          </article>

          <aside className="w-full lg:sticky lg:top-24 lg:w-[300px]">
            <InlineCTA compact />
          </aside>
        </div>
      </section>

      <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content space-y-6">
          <h2 className="text-[32px] font-bold text-text-primary">Related posts</h2>
          <RelatedPostsGrid posts={relatedPosts} />
        </div>
      </section>

      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content space-y-6">
          <h2 className="text-[32px] font-bold text-text-primary">Try the tools</h2>
          <p className="max-w-[760px] text-base leading-[1.7] text-text-secondary">
            Move from insight to action with the flagship Career Switch Planner,
            then unlock unlimited workflows on pricing.
          </p>
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <ToolCard
              slug="career-switch-planner"
              title="Career Switch Planner"
              description="Generate a personalized roadmap with role-fit diagnostics, transition priorities, and resume-ready positioning."
              icon="planner"
              isActive
            />
            <div className="rounded-lg border border-border bg-bg-secondary p-5 shadow-card">
              <h3 className="text-lg font-bold text-text-primary">
                Need unlimited access?
              </h3>
              <p className="mt-2 text-sm leading-[1.65] text-text-secondary">
                Compare Free, Pro ($7/month), and Lifetime ($49 one-time) plans.
              </p>
              <div className="mt-4">
                <Link href="/pricing">
                  <Button variant="outline">See Pricing</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
