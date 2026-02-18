'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Button from '@/components/Button'
import { useAuth } from '@/lib/auth/context'

export default function AccountPage() {
  const { user, isPro, isLoading, signOut } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/login')
    }
  }, [user, isLoading])

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content text-center text-text-secondary">Loading account...</div>
      </section>
    )
  }

  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[860px]">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">ACCOUNT</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Account Settings</h1>

        <div className="mt-8 space-y-6">
          <article className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-text-primary">Email</dt>
                <dd className="mt-1 text-text-secondary">{user?.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-text-primary">User ID</dt>
                <dd className="mt-1 break-all font-mono text-text-secondary">{user?.id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-text-primary">Plan</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${
                      isPro
                        ? 'border border-success/20 bg-success-light text-success'
                        : 'border border-border bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {isPro ? 'Pro' : 'Free'}
                  </span>
                </dd>
              </div>
            </dl>
          </article>

          {!isPro && (
            <article className="rounded-lg border border-accent/30 bg-accent-light p-6 shadow-card">
              <h2 className="text-xl font-semibold text-text-primary">Upgrade to Pro</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Unlock unlimited uses for every tool with priority support.
              </p>
              <Link href="/pricing" className="mt-5 inline-block">
                <Button variant="primary">View Pricing</Button>
              </Link>
            </article>
          )}

          <article className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <h2 className="text-xl font-semibold text-text-primary">Usage</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isPro
                ? 'You have unlimited access to all tools.'
                : 'Free plan includes 3 uses per tool.'}
            </p>
            <Link href="/tools" className="mt-5 inline-block">
              <Button variant="outline">Open Tools</Button>
            </Link>
          </article>

          <article className="rounded-lg border border-border bg-surface p-6 shadow-card">
            <h2 className="text-xl font-semibold text-text-primary">Session</h2>
            <p className="mt-2 text-sm text-text-secondary">Sign out from your account on this device.</p>
            <div className="mt-5">
              <Button variant="secondary" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}