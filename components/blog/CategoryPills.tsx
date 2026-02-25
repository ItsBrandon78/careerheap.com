'use client'

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
  const chipBase =
    'inline-flex items-center rounded-pill border px-3 py-1 text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'

  const selectedChip = 'border-accent/30 bg-accent-light text-accent'
  const idleChip =
    'border-border bg-surface text-text-secondary hover:border-accent/25 hover:text-accent'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect('all')}
        aria-pressed={selectedCategory === 'all'}
        className={`${chipBase} ${selectedCategory === 'all' ? selectedChip : idleChip}`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          onClick={() => onSelect(category.slug)}
          aria-pressed={selectedCategory === category.slug}
          className={`${chipBase} ${
            selectedCategory === category.slug ? selectedChip : idleChip
          }`}
        >
          {category.title}
        </button>
      ))}
    </div>
  )
}
