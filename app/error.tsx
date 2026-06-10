'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the console / monitoring; no PII in the message.
    console.error('Route error boundary:', error)
  }, [error])

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[560px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">We hit a snag</h1>
        <p className="mt-2 text-text-secondary">
          This page ran into an unexpected error. Your work and account are safe — try again, and
          if it keeps happening, head back home.
        </p>
        {error?.digest ? (
          <p className="mt-3 text-xs text-text-tertiary">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
