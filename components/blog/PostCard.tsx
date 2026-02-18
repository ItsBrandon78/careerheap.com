import Image from 'next/image'
import Link from 'next/link'
import Card from '@/components/Card'
import PostMetaRow from '@/components/blog/PostMetaRow'
import type { BlogPostSummary } from '@/lib/blog/types'

interface PostCardProps {
  post: BlogPostSummary
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden p-0" hover>
        <div className="relative h-[190px] w-full bg-accent-light">
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <span className="w-fit rounded-pill border border-accent/20 bg-accent-light px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] text-accent">
            {post.category.title.toUpperCase()}
          </span>

          <h3 className="text-[18px] font-semibold leading-[1.35] text-text-primary">
            {post.title}
          </h3>

          <p className="text-sm leading-[1.65] text-text-secondary">
            {post.excerpt}
          </p>

          <PostMetaRow
            compact
            authorName={post.authorName}
            publishedAt={post.publishedAt}
            readTimeMinutes={post.readTimeMinutes}
          />

          <p className="mt-auto text-sm font-semibold text-accent">Read more -&gt;</p>
        </div>
      </Card>
    </Link>
  )
}
