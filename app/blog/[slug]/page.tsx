import type { Metadata } from 'next'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'
import { notFound } from 'next/navigation'
import ContentTypography from '@/components/blog/ContentTypography'
import PostViewTracker from '@/components/blog/PostViewTracker'
import ReadingProgress from '@/components/blog/ReadingProgress'
import BlogCover from '@/components/blog/BlogCover'
import { portableTextComponents } from '@/components/blog/portableTextComponents'
import { Icon } from '@/components/ui/Icon'
import { formatPublishedDate, getDefaultOgImageUrl, getSiteBaseUrl, toReadTimeLabel } from '@/lib/blog/utils'
import { getBlogPostBySlug, getBlogSlugs, getRelatedBlogPosts } from '@/lib/sanity/api'
import { getServerT } from '@/lib/i18n/server'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 120

export async function generateStaticParams() {
  const slugs = await getBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return { title: 'Post Not Found | CareerHeap Blog' }
  }

  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt
  const canonical = `${getSiteBaseUrl()}/blog/${post.slug}`
  const ogImage = post.coverImage?.url || getDefaultOgImageUrl()

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      publishedTime: post.publishedAt,
      images: [{ url: ogImage, alt: post.coverImage?.alt || post.title }]
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] }
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || 'CH'
}

const teal = 'inline-flex w-fit items-center rounded-pill bg-[#e3f7f6] px-2.5 py-1 text-[12px] font-semibold text-[#0a7f7e]'
const neutral = 'inline-flex w-fit items-center rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary'
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-[22px] py-[13px] text-[15px] font-semibold text-white shadow-button transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px'

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedBlogPosts({
    postId: post.id,
    categorySlug: post.category.slug,
    limit: 2
  })
  // getRelatedBlogPosts returns same-category posts, falling back to any category
  // only when none exist — so only claim "More in {category}" when it's accurate.
  const sameCategoryRelated =
    relatedPosts.length > 0 && relatedPosts.every((p) => p.category.slug === post.category.slug)
  const { t } = await getServerT()
  const relatedHeading = sameCategoryRelated
    ? t(`More in ${post.category.title}`, `Plus dans ${post.category.title}`)
    : t('Keep reading', 'Continuez la lecture')
  const canonicalUrl = `${getSiteBaseUrl()}/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.authorName },
    image: post.coverImage?.url || getDefaultOgImageUrl(),
    mainEntityOfPage: canonicalUrl,
    description: post.seoDescription || post.excerpt
  }

  return (
    <>
      <ReadingProgress />
      <PostViewTracker slug={post.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
          <Icon name="arrowLeft" size={15} /> {t('All articles', 'Tous les articles')}
        </Link>

        <div className="mt-6">
          <span className={teal}>{post.category.title}</span>
        </div>

        <h1 className="mt-4 font-extrabold leading-[1.15]" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
          {post.title}
        </h1>

        <div className="mt-[18px] flex flex-wrap items-center gap-3 text-[14px] text-text-tertiary">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-accent-light text-[13px] font-bold text-accent">
            {initials(post.authorName)}
          </span>
          <span className="font-semibold text-text-secondary">{post.authorName}</span>
          <span>·</span>
          <span>{formatPublishedDate(post.publishedAt)}</span>
          <span>·</span>
          <span>{toReadTimeLabel(post.readTimeMinutes)}</span>
        </div>

        <div className="mt-7 overflow-hidden rounded-lg">
          <BlogCover
            category={post.category.title}
            imageUrl={post.coverImage?.url ?? null}
            imageAlt={post.coverImage?.alt || `${post.title} cover illustration`}
            height={400}
          />
        </div>

        {post.excerpt ? (
          <p className="mt-8 text-[19px] font-medium leading-[1.7] text-text-primary">{post.excerpt}</p>
        ) : null}

        <div className="mt-7">
          <ContentTypography>
            <PortableText value={post.body} components={portableTextComponents} />
          </ContentTypography>
        </div>

        {/* #tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border-light pt-6">
            <span className="self-center text-[13px] font-semibold text-text-tertiary">Tags:</span>
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-pill border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text-secondary"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* single clean CTA */}
        <div className="relative mt-11 overflow-hidden rounded-xl bg-bg-dark" style={{ padding: '28px 30px' }}>
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 90% 0%, rgba(36,93,255,0.4), transparent 50%)' }}
          />
          <div className="relative">
            <h3 className="text-[21px] font-extrabold text-white">{t('Ready to put this into a real plan?', 'Prêt à transformer cela en un vrai plan?')}</h3>
            <p className="mt-2 text-[15px] text-text-on-dark-muted">
              {t('Build your free, source-backed roadmap in four minutes.', 'Créez votre feuille de route gratuite et sourcée en quatre minutes.')}
            </p>
            <Link href="/tools/career-switch-planner" className={`${btnPrimary} mt-[18px]`}>
              <Icon name="rocket" size={16} /> {t('Build my plan', 'Créer mon plan')}
            </Link>
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingBottom: 72 }}>
          <h3 className="text-[20px] font-extrabold">{relatedHeading}</h3>
          <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2">
            {relatedPosts.slice(0, 2).map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="flex flex-col gap-2 rounded-lg border border-border-light bg-surface p-[22px] shadow-card transition-shadow hover:shadow-panel"
              >
                <span className={neutral}>{p.category.title}</span>
                <h4 className="text-[16.5px] font-bold leading-[1.3]">{p.title}</h4>
                <span className="text-[12.5px] text-text-tertiary">
                  {formatPublishedDate(p.publishedAt)} · {toReadTimeLabel(p.readTimeMinutes)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
