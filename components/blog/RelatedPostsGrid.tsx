import PostCard from '@/components/blog/PostCard'
import type { BlogPostSummary } from '@/lib/blog/types'

interface RelatedPostsGridProps {
  posts: BlogPostSummary[]
}

export default function RelatedPostsGrid({ posts }: RelatedPostsGridProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
