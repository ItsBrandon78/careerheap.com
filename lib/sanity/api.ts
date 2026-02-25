import type { BlogBodyBlock, BlogCategory, BlogCoverImage, BlogPost } from '@/lib/blog/types'
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

interface SanityImageDimensions {
  width?: number
  height?: number
}

interface SanityImageValue {
  alt?: string
  crop?: unknown
  hotspot?: unknown
  asset?: unknown
  dimensions?: SanityImageDimensions
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

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

function buildCoverImage(postTitle: string, coverImage?: SanityImageValue): BlogCoverImage | null {
  if (!coverImage?.asset) {
    return null
  }

  const width = toPositiveInt(coverImage.dimensions?.width, 1600)
  const height = toPositiveInt(coverImage.dimensions?.height, 900)
  const url = getSanityImageUrl(coverImage)
    ?.width(width)
    ?.height(height)
    ?.fit('crop')
    ?.auto('format')
    ?.url()

  if (!url) {
    return null
  }

  return {
    url,
    width,
    height,
    alt: coverImage.alt?.trim() || `${postTitle} cover illustration`
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
  const coverImage = buildCoverImage(post.title, post.coverImage)

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
    coverImage,
    popularityScore: 0,
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

export async function getAllBlogPosts() {
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
