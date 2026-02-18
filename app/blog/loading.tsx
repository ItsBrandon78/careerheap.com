import { BlogGridSkeleton } from '@/components/blog/Skeletons'

export default function BlogLoading() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col items-center gap-4">
          <div className="h-4 w-56 animate-pulse rounded bg-border" />
          <div className="h-12 w-80 animate-pulse rounded bg-border" />
          <div className="h-5 w-full max-w-[760px] animate-pulse rounded bg-border" />
        </div>
      </section>
      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content space-y-6">
          <div className="h-9 w-52 animate-pulse rounded bg-border" />
          <div className="h-[340px] animate-pulse rounded-lg border border-border bg-bg-secondary" />
          <div className="h-14 animate-pulse rounded-lg border border-border bg-bg-secondary" />
          <BlogGridSkeleton />
        </div>
      </section>
    </>
  )
}
