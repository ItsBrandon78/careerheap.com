import PostCard from '@/components/blog/PostCard'
import type { BlogPostSummary } from '@/lib/blog/types'

interface BlogCardProps {
  title: string
  slug: string
  category: string
  date: string
  readTime: string
  excerpt?: string
  authorName?: string
  coverImageUrl?: string | null
}

function parseReadTimeMinutes(readTime: string) {
  const minutes = Number.parseInt(readTime, 10)
  return Number.isFinite(minutes) ? Math.max(minutes, 1) : 5
}

export default function BlogCard({
  title,
  slug,
  category,
  date,
  readTime,
  excerpt = 'Practical, actionable advice to help you execute your next career move.',
  authorName = 'CareerHeap Team',
  coverImageUrl = null
}: BlogCardProps) {
  const dateMs = Date.parse(date)

  const post: BlogPostSummary = {
    id: `card-${slug}`,
    slug,
    title,
    excerpt,
    category: {
      title: category,
      slug: category.toLowerCase().replace(/\s+/g, '-')
    },
    authorName,
    publishedAt: Number.isNaN(dateMs)
      ? new Date().toISOString()
      : new Date(dateMs).toISOString(),
    readTimeMinutes: parseReadTimeMinutes(readTime),
    coverImage: coverImageUrl
      ? {
          url: coverImageUrl,
          width: 1600,
          height: 900,
          alt: title
        }
      : null,
    popularityScore: 0
  }

  return <PostCard post={post} />
}
