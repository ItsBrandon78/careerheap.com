import React from 'react';
import Link from 'next/link';
import Badge from './Badge';

interface BlogCardProps {
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  date: string;
  readTime?: string;
  image?: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  title,
  excerpt,
  slug,
  category,
  date,
  readTime = '5 min read',
  image,
}) => {
  return (
    <Link href={`/blog/${slug}`}>
      <article className="group overflow-hidden rounded-lg border border-surface bg-card transition-shadow hover:shadow-md">
        {image && (
          <div className="relative h-48 w-full overflow-hidden bg-gray-200">
            {/* Image placeholder - replace with image component in real app */}
            <div className="h-full w-full bg-linear-to-br from-sky-100 to-blue-100" />
          </div>
        )}
        <div className="p-6">
          <Badge variant="info">{category}</Badge>
          <h3 className="mt-3 text-xl font-bold text-navy group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-2 text-muted">{excerpt}</p>
          <div className="mt-4 flex items-center justify-between text-xs text-surface">
            <time dateTime={date}>{new Date(date).toLocaleDateString()}</time>
            <span>{readTime}</span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default BlogCard;
