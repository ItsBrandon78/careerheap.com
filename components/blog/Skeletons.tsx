export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="h-[190px] animate-pulse bg-bg-secondary" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-24 animate-pulse rounded-pill bg-bg-secondary" />
        <div className="h-5 w-[85%] animate-pulse rounded bg-bg-secondary" />
        <div className="h-5 w-[70%] animate-pulse rounded bg-bg-secondary" />
        <div className="h-4 w-[60%] animate-pulse rounded bg-bg-secondary" />
      </div>
    </div>
  )
}

export function BlogGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  )
}
