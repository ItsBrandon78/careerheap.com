'use client'

import CategoryPills from '@/components/blog/CategoryPills'
import SearchInput from '@/components/blog/SearchInput'
import type { BlogCategory } from '@/lib/blog/types'

interface FilterRowProps {
  categories: BlogCategory[]
  selectedCategory: string
  onCategorySelect: (value: string) => void
  searchTerm: string
  onSearchChange: (value: string) => void
  sortBy: 'newest' | 'popular'
  onSortChange: (value: 'newest' | 'popular') => void
}

export default function FilterRow({
  categories,
  selectedCategory,
  onCategorySelect,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange
}: FilterRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-secondary p-4 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput value={searchTerm} onChange={onSearchChange} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={onCategorySelect}
        />

        <label className="flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(event) =>
              onSortChange(event.target.value as 'newest' | 'popular')
            }
            className="bg-transparent text-text-primary outline-none focus-visible:outline-none"
            aria-label="Sort posts"
          >
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
          </select>
        </label>
      </div>
    </div>
  )
}
