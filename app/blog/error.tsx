'use client'

import Link from 'next/link'
import Button from '@/components/Button'

export default function BlogError({
  reset
}: {
  error: Error
  reset: () => void
}) {
  return (
    <section className="min-h-[50vh] px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content rounded-lg border border-border bg-bg-secondary p-8 text-center">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">
          BLOG ERROR
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">
          We could not load the blog right now
        </h1>
        <p className="mt-2 text-text-secondary">
          Please try again. If this continues, check Sanity project credentials
          and dataset visibility.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Link href="/tools/career-switch-planner">
            <Button variant="outline">Go to Career Switch Planner</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
