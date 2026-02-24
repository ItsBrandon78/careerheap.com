'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const statusMessageId = 'signup-status-message'

  const handleGoogleSignup = async () => {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (oauthError) throw oauthError
    } catch {
      setError('Unable to continue with Google right now.')
      setIsLoading(false)
    }
  }

  const handleEmailSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) throw signUpError

      if (data?.session) {
        router.push('/tools')
        return
      }

      setMessage(
        'Account created. Check your email for verification instructions.'
      )
      setPassword('')
    } catch {
      setError('Unable to create account right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px] lg:py-[92px]">
      <div className="mx-auto grid w-full max-w-content gap-14 lg:grid-cols-[1fr_520px]">
        <div className="flex flex-col gap-5">
          <Badge className="w-fit">ACCOUNT SETUP</Badge>
          <h1 className="max-w-[560px] text-[42px] font-bold leading-[1.15] text-text-primary md:text-[48px]">
            Create your CareerHeap account
          </h1>
          <p className="max-w-[560px] text-[18px] leading-[1.65] text-text-secondary">
            Save tool history, unlock billing controls, and continue with Google in one click.
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>• 3 free lifetime uses are tracked to your account.</p>
            <p>• Google sign in, magic link, and password login stay in one account.</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-7 shadow-panel">
          <h2 className="text-[30px] font-bold text-text-primary">Start for free</h2>
          <p className="mt-1 text-sm leading-[1.6] text-text-secondary">
            Create your account to save plans and unlock paid features when needed.
          </p>

          <AuthConfigNotice className="mt-4" />

          {error ? (
            <p
              id={statusMessageId}
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p
              id={statusMessageId}
              role="status"
              aria-live="polite"
              className="mt-4 rounded-md border border-success/20 bg-success-light px-3 py-2 text-sm text-success"
            >
              {message}
            </p>
          ) : null}

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              Continue with Google
            </Button>
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-text-tertiary">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-3">
            <label className="block text-[13px] font-semibold text-text-primary">
              Email address
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error || message ? statusMessageId : undefined}
                className="mt-1.5 h-[50px] w-full rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="you@company.com"
              />
            </label>

            <label className="block text-[13px] font-semibold text-text-primary">
              Password
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error || message ? statusMessageId : undefined}
                className="mt-1.5 h-[50px] w-full rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="At least 8 characters"
              />
            </label>

            <Button type="submit" className="mt-1 w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="mt-3 text-xs leading-[1.5] text-text-tertiary">
            By creating an account, you agree to{' '}
            <Link href="/terms" className="text-accent hover:text-accent-hover">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-accent hover:text-accent-hover">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="mt-2 text-[13px] text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:text-accent-hover">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
