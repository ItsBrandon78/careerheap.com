import type { PortableTextBlock } from 'sanity'
import { blogPostTemplates } from '@/src/design/mockupData'
import type { BlogBodyBlock, BlogCategory, BlogPost } from '@/lib/blog/types'
import { estimateReadTimeMinutes, portableTextToPlainText } from '@/lib/blog/utils'
import { sanityFetch } from '@/lib/sanity/client'
import { isSanityConfigured } from '@/lib/sanity/env'
import { getSanityImageUrl } from '@/lib/sanity/image'
import {
  allPublishedPostsQuery,
  blogCategoriesQuery,
  blogSlugsQuery,
  fallbackRelatedPostsQuery,
  postBySlugQuery,
  relatedPostsQuery
} from '@/lib/sanity/queries'

const isDevelopmentFallbackMode =
  !isSanityConfigured && process.env.NODE_ENV !== 'production'

interface SanityImageValue {
  alt?: string
  asset?: unknown
}

interface SanityCategoryValue {
  title?: string
  slug?: string
}

interface SanityAuthorValue {
  name?: string
  bio?: string
  avatar?: SanityImageValue
}

interface SanityPostValue {
  _id: string
  slug?: string
  title?: string
  excerpt?: string
  publishedAt?: string
  readTime?: number
  seoTitle?: string
  seoDescription?: string
  coverImage?: SanityImageValue
  category?: SanityCategoryValue
  author?: SanityAuthorValue
  body?: BlogBodyBlock[]
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1564627488683-453be0de2aad?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1762341123685-098ecb6c3ef7?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1681505526188-b05e68c77582?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1758874383489-7be291a44415?auto=format&fit=crop&w=1600&q=80'
]

function makeBlock(text: string, key: string, style: PortableTextBlock['style'] = 'normal'): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style,
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        marks: [],
        text
      }
    ]
  }
}

function normalizeCategory(category?: SanityCategoryValue): BlogCategory {
  if (!category?.title || !category?.slug) {
    return {
      title: 'General',
      slug: 'general'
    }
  }

  return {
    title: category.title,
    slug: category.slug
  }
}

function normalizePost(post: SanityPostValue): BlogPost | null {
  if (!post.slug || !post.title || !post.publishedAt) {
    return null
  }

  const category = normalizeCategory(post.category)
  const body = Array.isArray(post.body) ? post.body : []
  const plainText = portableTextToPlainText(body)
  const excerpt = post.excerpt?.trim() || plainText.slice(0, 180)
  const readTimeMinutes = post.readTime || estimateReadTimeMinutes(`${excerpt} ${plainText}`.trim())
  const coverImageUrl = post.coverImage?.asset
    ? getSanityImageUrl(post.coverImage.asset)
        ?.width(1600)
        ?.height(900)
        ?.fit('crop')
        ?.auto('format')
        ?.url() || null
    : null

  const authorAvatarUrl = post.author?.avatar?.asset
    ? getSanityImageUrl(post.author.avatar.asset)
        ?.width(120)
        ?.height(120)
        ?.fit('crop')
        ?.auto('format')
        ?.url() || null
    : null

  return {
    id: post._id,
    slug: post.slug,
    title: post.title,
    excerpt,
    publishedAt: post.publishedAt,
    readTimeMinutes,
    coverImageUrl,
    coverImageAlt: post.coverImage?.alt || post.title,
    category,
    authorName: post.author?.name || 'CareerHeap Team',
    author: post.author
      ? {
          name: post.author.name || 'CareerHeap Team',
          bio: post.author.bio || null,
          avatarUrl: authorAvatarUrl
        }
      : null,
    body,
    seoTitle: post.seoTitle || null,
    seoDescription: post.seoDescription || null
  }
}

function fallbackPosts(): BlogPost[] {
  return blogPostTemplates.map((post, index) => {
    const sectionBlocks = post.sections.flatMap((section, sectionIndex) => [
      makeBlock(section.heading, `${post.slug}-h2-${sectionIndex}`, 'h2'),
      makeBlock(section.body, `${post.slug}-p-${sectionIndex}`, 'normal')
    ])

    const body = [makeBlock(post.intro, `${post.slug}-intro`), ...sectionBlocks]

    return {
      id: `mock-${post.slug}`,
      slug: post.slug,
      title: post.title,
      excerpt: post.intro,
      category: {
        title: post.category,
        slug: post.category.toLowerCase().replace(/\s+/g, '-')
      },
      authorName: post.author,
      publishedAt: new Date(Date.parse(post.date)).toISOString(),
      readTimeMinutes: Number.parseInt(post.readTime, 10) || estimateReadTimeMinutes(post.intro),
      coverImageUrl: fallbackImages[index % fallbackImages.length],
      coverImageAlt: post.title,
      author: {
        name: post.author,
        bio: null,
        avatarUrl: null
      },
      body,
      seoTitle: post.title,
      seoDescription: post.intro
    }
  })
}

export async function getAllBlogPosts() {
  if (isDevelopmentFallbackMode) {
    return fallbackPosts()
  }
  if (!isSanityConfigured) {
    return []
  }

  const posts = await sanityFetch<SanityPostValue[]>({
    query: allPublishedPostsQuery,
    tags: ['blog', 'blog-posts']
  })

  return posts.map(normalizePost).filter((post): post is BlogPost => Boolean(post))
}

export async function getBlogPostBySlug(slug: string) {
  if (isDevelopmentFallbackMode) {
    return fallbackPosts().find((post) => post.slug === slug) || null
  }
  if (!isSanityConfigured) {
    return null
  }

  const post = await sanityFetch<SanityPostValue | null, { slug: string }>({
    query: postBySlugQuery,
    params: { slug },
    tags: ['blog', `blog-post:${slug}`]
  })

  if (!post) {
    return null
  }

  return normalizePost(post)
}

export async function getRelatedBlogPosts(options: {
  postId: string
  categorySlug: string
  limit?: number
}) {
  const { postId, categorySlug, limit = 3 } = options

  if (isDevelopmentFallbackMode) {
    return fallbackPosts()
      .filter((post) => post.id !== postId && post.category.slug === categorySlug)
      .slice(0, limit)
  }
  if (!isSanityConfigured) {
    return []
  }

  const posts = await sanityFetch<SanityPostValue[], { postId: string; categorySlug: string; limit: number }>({
    query: relatedPostsQuery,
    params: { postId, categorySlug, limit },
    tags: ['blog', `blog-related:${postId}`]
  })

  const normalized = posts
    .map(normalizePost)
    .filter((post): post is BlogPost => Boolean(post))

  if (normalized.length > 0) {
    return normalized
  }

  const fallback = await sanityFetch<SanityPostValue[], { postId: string; limit: number }>({
    query: fallbackRelatedPostsQuery,
    params: { postId, limit },
    tags: ['blog', `blog-related-fallback:${postId}`]
  })

  return fallback
    .map(normalizePost)
    .filter((post): post is BlogPost => Boolean(post))
}

export async function getBlogCategories() {
  if (isDevelopmentFallbackMode) {
    const categories = new Map<string, BlogCategory>()
    for (const post of fallbackPosts()) {
      categories.set(post.category.slug, post.category)
    }
    return Array.from(categories.values())
  }
  if (!isSanityConfigured) {
    return []
  }

  const categories = await sanityFetch<SanityCategoryValue[]>({
    query: blogCategoriesQuery,
    tags: ['blog', 'blog-categories']
  })

  return categories
    .filter((category): category is BlogCategory => Boolean(category.slug && category.title))
    .map((category) => ({
      slug: category.slug,
      title: category.title
    }))
}

export async function getBlogSlugs() {
  if (isDevelopmentFallbackMode) {
    return fallbackPosts().map((post) => post.slug)
  }
  if (!isSanityConfigured) {
    return []
  }

  const slugs = await sanityFetch<Array<{ slug?: string }>>({
    query: blogSlugsQuery,
    tags: ['blog', 'blog-slugs']
  })

  return slugs
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug))
}
