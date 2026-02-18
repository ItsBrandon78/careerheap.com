import { PostCardSkeleton } from '@/components/blog/Skeletons'

export default function BlogPostLoading() {
  return (
    <>
      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content space-y-6">
          <div className="h-7 w-32 animate-pulse rounded bg-border" />
          <div className="h-12 w-full max-w-[820px] animate-pulse rounded bg-border" />
          <div className="h-6 w-72 animate-pulse rounded bg-border" />
          <div className="h-[320px] animate-pulse rounded-lg bg-bg-secondary md:h-[420px]" />
        </div>
      </section>
      <section className="px-4 pb-16 lg:px-[170px]">
        <div className="mx-auto grid max-w-content gap-8 lg:grid-cols-[760px_300px]">
          <div className="space-y-4">
            <div className="h-6 w-full animate-pulse rounded bg-border" />
            <div className="h-40 animate-pulse rounded-lg bg-bg-secondary" />
            <div className="h-72 animate-pulse rounded-lg bg-bg-secondary" />
          </div>
          <div className="h-52 animate-pulse rounded-lg bg-bg-secondary" />
        </div>
      </section>
      <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="grid gap-6 md:grid-cols-3">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        </div>
      </section>
    </>
  )
}
