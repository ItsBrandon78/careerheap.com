'use client'

import Link from 'next/link'
import Button from '@/components/Button'

export default function BlogPostError({
  reset
}: {
  error: Error
  reset: () => void
}) {
  return (
    <section className="min-h-[50vh] px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content rounded-lg border border-border bg-bg-secondary p-8 text-center">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">
          POST ERROR
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">
          We could not load this article
        </h1>
        <p className="mt-2 text-text-secondary">
          Please retry. If this keeps happening, the post may be unpublished or
          unavailable.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Link href="/blog">
            <Button variant="outline">Back to Blog</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
