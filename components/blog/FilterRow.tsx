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
  popularEnabled: boolean
}

export default function FilterRow({
  categories,
  selectedCategory,
  onCategorySelect,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  popularEnabled
}: FilterRowProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          className="lg:max-w-[380px]"
        />

        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={onCategorySelect}
        />

        <label className="relative inline-flex w-fit items-center rounded-md border border-border bg-surface px-3 py-2">
          <select
            value={sortBy}
            onChange={(event) =>
              onSortChange(event.target.value as 'newest' | 'popular')
            }
            className="appearance-none bg-transparent pr-5 text-sm font-semibold text-text-primary outline-none"
            aria-label="Sort posts"
          >
            <option value="newest">Newest</option>
            <option value="popular" disabled={!popularEnabled}>
              Popular
            </option>
          </select>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          >
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </label>
      </div>
    </div>
  )
}
