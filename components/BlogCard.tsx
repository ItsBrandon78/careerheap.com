import React from 'react'
import Link from 'next/link'
import Card from './Card'

interface BlogCardProps {
  title: string
  slug: string
  category: string
  date: string
  readTime: string
}

export const BlogCard: React.FC<BlogCardProps> = ({ title, slug, category, date, readTime }) => {
  return (
    <Link href={`/blog/${slug}`}>
      <Card className="h-full overflow-hidden p-0">
        <div className="h-[180px] bg-accent-light" />
        <div className="space-y-3 p-5">
          <p className="text-[11px] font-semibold tracking-[1px] text-accent">{category.toUpperCase()}</p>
          <h3 className="text-base font-semibold leading-[1.4] text-text-primary">{title}</h3>
          <p className="text-[13px] text-text-tertiary">
            {date} | {readTime}
          </p>
        </div>
      </Card>
    </Link>
  )
}

export default BlogCard