'use client'

import Badge from '@/components/Badge'
import type { BlogCategory } from '@/lib/blog/types'

interface CategoryPillsProps {
  categories: BlogCategory[]
  selectedCategory: string
  onSelect: (value: string) => void
}

export default function CategoryPills({
  categories,
  selectedCategory,
  onSelect
}: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect('all')}
        aria-pressed={selectedCategory === 'all'}
        className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Badge
          variant="default"
          className={
            selectedCategory === 'all'
              ? ''
              : 'border-border bg-surface text-text-secondary'
          }
        >
          All
        </Badge>
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => onSelect(category.slug)}
          aria-pressed={selectedCategory === category.slug}
          className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Badge
            variant="default"
            className={
              selectedCategory === category.slug
                ? ''
                : 'border-border bg-surface text-text-secondary'
            }
          >
            {category.title}
          </Badge>
        </button>
      ))}
    </div>
  )
}
