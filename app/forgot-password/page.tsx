'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import Card from '@/components/Card'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const statusMessageId = 'forgot-password-status-message'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })

      if (resetError) throw resetError
      setMessage(
        'If an account exists for this email, you will receive a password reset link.'
      )
      setEmail('')
    } catch {
      setError('Unable to process your request right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <Card className="mx-auto w-full max-w-[460px] p-8 shadow-panel">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">ACCOUNT SECURITY</p>
          <h1 className="mt-3 text-[30px] font-bold text-text-primary">Forgot your password?</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email and we&apos;ll send reset instructions if an account exists.
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
          <div className="mt-6 space-y-4">
            <p
              id={statusMessageId}
              role="status"
              aria-live="polite"
              className="rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success"
            >
              {message}
            </p>
            <p className="text-sm text-text-secondary">
              Check your inbox and spam folder. The link may take a minute to arrive.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error || message ? statusMessageId : undefined}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-3">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send reset link
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Back to sign in
              </Button>
            </div>
            <p className="text-sm text-text-secondary">
              Check your spam folder if you do not see the reset email.
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-secondary">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-accent hover:text-accent-hover">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-accent hover:text-accent-hover">
            Privacy Policy
          </Link>
          .
        </p>
      </Card>
    </section>
  )
}
