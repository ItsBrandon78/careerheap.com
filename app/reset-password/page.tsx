'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const statusMessageId = 'reset-password-status-message'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setMessage('Password updated. Redirecting to your account...')
      setTimeout(() => {
        router.replace('/account?tab=security')
      }, 800)
    } catch {
      setError('Could not reset password. Request a new reset link and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto w-full max-w-[460px] rounded-lg border border-border bg-surface p-8 shadow-panel">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">SECURITY</p>
          <h1 className="mt-3 text-[30px] font-bold text-text-primary">Set New Password</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Choose a strong password for your account.
          </p>
        </header>

        <AuthConfigNotice className="mt-4" />

        {error ? (
          <p
            id={statusMessageId}
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error"
          >
            {error}
          </p>
        ) : null}

        {message ? (
          <p
            id={statusMessageId}
            role="status"
            aria-live="polite"
            className="mt-4 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success"
          >
            {message}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-text-primary">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error || message ? statusMessageId : undefined}
              className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              placeholder="********"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-text-primary"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error || message ? statusMessageId : undefined}
              className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              placeholder="********"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  )
}
