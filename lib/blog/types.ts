import type { PortableTextBlock } from 'sanity'

export type BlogCalloutVariant = 'info' | 'tip' | 'warning'

export interface BlogCalloutBlock {
  _type: 'callout'
  _key?: string
  variant: BlogCalloutVariant
  title: string
  body: string
}

export type BlogBodyBlock = PortableTextBlock | BlogCalloutBlock

export interface BlogCategory {
  title: string
  slug: string
}

export interface BlogAuthor {
  name: string
  bio?: string | null
  avatarUrl?: string | null
}

export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  category: BlogCategory
  authorName: string
  publishedAt: string
  readTimeMinutes: number
  coverImageUrl: string | null
  coverImageAlt: string
}

export interface BlogPost extends BlogPostSummary {
  body: BlogBodyBlock[]
  seoTitle?: string | null
  seoDescription?: string | null
  author?: BlogAuthor | null
}
