import Image from 'next/image'
import Link from 'next/link'
import Card from '@/components/Card'
import PostMetaRow from '@/components/blog/PostMetaRow'
import type { BlogPostSummary } from '@/lib/blog/types'

interface FeaturedPostCardProps {
  post: BlogPostSummary
}

export default function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <Card className="overflow-hidden p-0" hover>
        <div className="relative h-[220px] w-full bg-accent-light md:h-[340px]">
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              sizes="(max-width: 1024px) 100vw, 1100px"
              priority
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <span className="w-fit rounded-pill border border-accent/20 bg-accent-light px-3 py-1 text-[11px] font-semibold tracking-[0.5px] text-accent">
            {post.category.title.toUpperCase()}
          </span>

          <h2 className="text-[28px] font-bold leading-[1.22] text-text-primary md:text-[32px]">
            {post.title}
          </h2>

          <p className="max-w-[900px] text-base leading-[1.75] text-text-secondary">
            {post.excerpt}
          </p>

          <PostMetaRow
            authorName={post.authorName}
            publishedAt={post.publishedAt}
            readTimeMinutes={post.readTimeMinutes}
          />

          <p className="text-sm font-semibold text-accent">Read more -&gt;</p>
        </div>
      </Card>
    </Link>
  )
}
