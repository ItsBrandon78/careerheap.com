import Link from 'next/link'
import Button from '@/components/Button'

export default function BlogPostNotFound() {
  return (
    <section className="min-h-[50vh] px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content rounded-lg border border-border bg-bg-secondary p-8 text-center">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">
          ARTICLE NOT FOUND
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">
          This post is unavailable
        </h1>
        <p className="mt-2 text-text-secondary">
          It may still be in draft, unpublished, or removed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
          <Link href="/tools/career-switch-planner">
            <Button variant="outline">Try Career Switch Planner</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
