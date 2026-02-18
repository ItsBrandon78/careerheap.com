'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { useAuth } from '@/lib/auth/context'

type AccountTab = 'profile' | 'security' | 'billing' | 'usage'

function tabFromQuery(value: string | null): AccountTab {
  if (value === 'security' || value === 'billing' || value === 'usage') return value
  return 'profile'
}

function planLabel(plan: 'free' | 'pro' | 'lifetime') {
  if (plan === 'pro') return 'Pro'
  if (plan === 'lifetime') return 'Lifetime'
  return 'Free'
}

function initialsFromEmail(email?: string | null) {
  if (!email) return 'CH'
  const first = email.split('@')[0] ?? 'ch'
  return first.slice(0, 2).toUpperCase()
}

export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = tabFromQuery(searchParams.get('tab'))

  const { user, plan, usage, isLoading, signOut, isUnlimited } = useAuth()
  const [fullName, setFullName] = useState('')
  const [toast, setToast] = useState('')
  const [securityError, setSecurityError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const inferredName = user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') ?? ''
  const effectiveFullName = fullName || inferredName

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, router, user])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const usageRows = useMemo(() => {
    const byTool = usage?.byTool ?? {}
    const defaults = [
      ['career-switch-planner', 0],
      ['resume-analyzer', 0],
      ['interview-prep', 0],
      ['cover-letter', 0]
    ] as const
    return defaults.map(([slug, fallback]) => [slug, byTool[slug] ?? fallback] as const)
  }, [usage?.byTool])

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-md bg-border" />
          <div className="h-36 animate-pulse rounded-lg bg-border" />
          <div className="h-64 animate-pulse rounded-lg bg-border" />
        </div>
      </section>
    )
  }

  if (!user) return null

  const renderTab = () => {
    if (tab === 'security') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">Security</h2>
          <p className="mt-1 text-sm text-text-secondary">Update your password to keep your account secure.</p>

          {securityError && (
            <p className="mt-4 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error">
              {securityError}
            </p>
          )}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => {
                if (newPassword.length < 8) {
                  setSecurityError('New password must be at least 8 characters.')
                  return
                }
                if (newPassword !== confirmPassword) {
                  setSecurityError('New passwords do not match.')
                  return
                }
                setSecurityError('')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setToast('Password updated.')
              }}
            >
              Update Password
            </Button>
            <Link href="/login" className="text-sm font-medium text-accent">
              Forgot password?
            </Link>
          </div>
        </Card>
      )
    }

    if (tab === 'billing') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">Billing</h2>
          {plan === 'free' ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">Plan: Free</p>
              <p className="text-sm text-text-secondary">
                You have used {usage?.used ?? 0} of {usage?.limit ?? 3} lifetime uses.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/checkout">
                  <Button variant="primary">Upgrade to Pro - $7/mo</Button>
                </Link>
                <Link href="/checkout?plan=lifetime">
                  <Button variant="outline">Get Lifetime - $49</Button>
                </Link>
              </div>
            </div>
          ) : plan === 'pro' ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">Plan: Pro ($7/month)</p>
              <p className="text-sm text-text-secondary">Next billing date: Mar 18, 2026</p>
              <p className="text-sm text-text-secondary">Payment method: Visa ending in 4242</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Update payment method</Button>
                <Button variant="outline">Download invoices</Button>
                <Button variant="ghost">Cancel subscription</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">Plan: Lifetime ($49 one-time)</p>
              <p className="text-sm text-text-secondary">No renewal. Your access is permanent.</p>
              <p className="rounded-md border border-success/20 bg-success-light px-3 py-2 text-sm text-success">
                Thank you for supporting CareerHeap as an early adopter.
              </p>
            </div>
          )}
        </Card>
      )
    }

    if (tab === 'usage') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">Usage</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {isUnlimited ? 'Unlimited usage enabled on your plan.' : `${usage?.usesRemaining ?? 3} of 3 lifetime uses left.`}
          </p>
          <div className="mt-5 space-y-2">
            {usageRows.map(([slug, count]) => (
              <div key={slug} className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm">
                <span className="capitalize text-text-secondary">{slug.replace(/-/g, ' ')}</span>
                <span className="font-semibold text-text-primary">{isUnlimited ? 'Unlimited' : count}</span>
              </div>
            ))}
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">Profile</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Full name</span>
              <input
                type="text"
                value={effectiveFullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">Email</span>
              <input
                type="email"
                value={user.email ?? ''}
                readOnly
                className="mt-2 w-full rounded-md border border-border bg-bg-secondary px-4 py-3 text-sm text-text-secondary"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setToast('Profile updated.')}>
              Save changes
            </Button>
            <button type="button" className="text-sm font-medium text-accent">
              Resend verification email
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">Security</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage password and session settings from one place.
          </p>
          <div className="mt-4">
            <Link href="/account?tab=security">
              <Button variant="outline">Open Security Settings</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">ACCOUNT</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Account Hub</h1>

        {toast && (
          <p className="mt-4 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success">
            {toast}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="h-fit p-3">
            {(['profile', 'security', 'billing', 'usage'] as const).map((item) => (
              <Link
                key={item}
                href={`/account?tab=${item}`}
                className={`block rounded-md px-3 py-2 text-sm font-medium capitalize ${
                  tab === item ? 'bg-accent-light text-accent' : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {item}
              </Link>
            ))}
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-pill bg-accent-light text-base font-semibold text-accent">
                    {initialsFromEmail(user.email)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{effectiveFullName || 'CareerHeap User'}</p>
                    <p className="text-sm text-text-secondary">You&apos;re signed in as: {user.email}</p>
                  </div>
                </div>
                <Badge>{planLabel(plan)}</Badge>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/account?tab=billing">
                  <Button variant="primary">
                    {plan === 'free' ? 'Upgrade' : 'Manage Billing'}
                  </Button>
                </Link>
                <Button variant="outline" onClick={signOut}>
                  Log out
                </Button>
              </div>
            </Card>

            {renderTab()}
          </div>
        </div>
      </div>
    </section>
  )
}
