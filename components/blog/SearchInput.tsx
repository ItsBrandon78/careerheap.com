'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search posts'
}: SearchInputProps) {
  return (
    <label className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 lg:max-w-[360px]">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-text-tertiary"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m13.5 13.5 3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
        aria-label="Search posts"
      />
    </label>
  )
}
