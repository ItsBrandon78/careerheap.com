'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/Button'
import { useAuth } from '@/lib/auth/context'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const { refreshUsage } = useAuth()
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const sessionId = searchParams.get('session_id')
      if (!sessionId) {
        if (!mounted) return
        setSyncError('Missing checkout session reference.')
        return
      }

      const response = await fetch('/api/stripe/sync-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!mounted) return

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        setSyncError(data?.error ?? 'Unable to finalize billing status.')
        return
      }

      await refreshUsage()
      setSyncError(null)
    }

    void run()

    return () => {
      mounted = false
    }
  }, [refreshUsage, searchParams])

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[600px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-2xl text-success">
          ?
        </div>
        <h1 className="mt-5 text-3xl font-bold text-text-primary">Purchase Complete</h1>
        <p className="mt-3 text-text-secondary">
          We&apos;re finalizing your billing status and unlocking your plan access.
        </p>
        {syncError ? (
          <p className="mt-3 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error">
            {syncError}
          </p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Link href="/tools" className="block">
            <Button variant="primary" className="w-full">
              Start Using Tools
            </Button>
          </Link>
          <Link href="/account?tab=billing" className="block">
            <Button variant="outline" className="w-full">
              Open Billing
            </Button>
          </Link>
        </div>

        <div className="mt-8 rounded-md border border-accent/20 bg-accent-light p-4 text-left">
          <p className="text-sm text-text-secondary">
            Tip: if status looks stale, open Billing and use the refresh action.
          </p>
        </div>
      </div>
    </section>
  )
}
