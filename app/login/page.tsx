'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackUrl } from '@/lib/supabase/authRedirect'

type AuthMode = 'magic-link' | 'password'

interface LoginAttemptState {
  attempts: number
  firstAttemptAt: number
  lockedUntil: number
}

const LOGIN_ATTEMPT_KEY = 'careerheap_login_attempts'
const MAX_PASSWORD_ATTEMPTS = 5
const PASSWORD_WINDOW_MS = 15 * 60 * 1000

function getKeyedAttemptState(email: string) {
  if (typeof window === 'undefined') return null
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOGIN_ATTEMPT_KEY) || '{}'
    ) as Record<string, LoginAttemptState>
    return parsed[normalizedEmail] ?? null
  } catch {
    return null
  }
}

function saveKeyedAttemptState(email: string, state: LoginAttemptState | null) {
  if (typeof window === 'undefined') return
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOGIN_ATTEMPT_KEY) || '{}'
    ) as Record<string, LoginAttemptState>

    if (state) {
      parsed[normalizedEmail] = state
    } else {
      delete parsed[normalizedEmail]
    }

    window.localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(parsed))
  } catch {
    // noop
  }
}

function getPasswordLockInfo(email: string) {
  const now = Date.now()
  const state = getKeyedAttemptState(email)
  if (!state) {
    return { isLocked: false, remainingMs: 0, state: null as LoginAttemptState | null }
  }

  if (state.lockedUntil > now) {
    return {
      isLocked: true,
      remainingMs: state.lockedUntil - now,
      state
    }
  }

  if (now - state.firstAttemptAt > PASSWORD_WINDOW_MS) {
    saveKeyedAttemptState(email, null)
    return { isLocked: false, remainingMs: 0, state: null as LoginAttemptState | null }
  }

  return { isLocked: false, remainingMs: 0, state }
}

function recordFailedPasswordAttempt(email: string) {
  const now = Date.now()
  const existing = getKeyedAttemptState(email)

  if (!existing || now - existing.firstAttemptAt > PASSWORD_WINDOW_MS) {
    saveKeyedAttemptState(email, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0
    })
    return
  }

  const nextAttempts = existing.attempts + 1
  const lockedUntil =
    nextAttempts >= MAX_PASSWORD_ATTEMPTS ? now + PASSWORD_WINDOW_MS : 0

  saveKeyedAttemptState(email, {
    attempts: nextAttempts,
    firstAttemptAt: existing.firstAttemptAt,
    lockedUntil
  })
}

function clearFailedPasswordAttempts(email: string) {
  saveKeyedAttemptState(email, null)
}

function formatRemainingMinutes(remainingMs: number) {
  const minutes = Math.ceil(remainingMs / (60 * 1000))
  return Math.max(1, minutes)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [safeNextPath, setSafeNextPath] = useState('/tools')
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link')
  const router = useRouter()
  const statusMessageId = 'login-status-message'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextParam = params.get('next')
    if (nextParam && nextParam.startsWith('/')) {
      setSafeNextPath(nextParam)
    }

    const authError = params.get('auth_error')
    if (!authError) return

    if (authError === 'oauth_cancelled') {
      setError('Google sign-in was cancelled. Try again or use magic link/password.')
      return
    }
    if (authError === 'callback_exchange_failed') {
      setError('Google sign-in could not be completed. Please try again.')
      return
    }
    setError('Sign-in could not be completed. Please try again.')
  }, [])

  const handleGoogleSignIn = async () => {
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl({ next: safeNextPath })
        }
      })

      if (oauthError) throw oauthError
    } catch {
      setError('Unable to continue with Google right now.')
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl({ next: safeNextPath })
        }
      })

      if (signInError) throw signInError

      if (data?.session) {
        router.push(safeNextPath)
        return
      }

      setMessage('Check your email for a magic link to log in.')
      setEmail('')
    } catch {
      setError('We could not send a magic link right now. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const lockInfo = getPasswordLockInfo(email)
      if (lockInfo.isLocked) {
        setError(
          `Too many login attempts. Try again in ${formatRemainingMinutes(
            lockInfo.remainingMs
          )} minute(s).`
        )
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        recordFailedPasswordAttempt(email)
        throw signInError
      }

      clearFailedPasswordAttempts(email)
      router.push(safeNextPath)
    } catch {
      setError('Invalid email or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto w-full max-w-[460px] rounded-lg border border-border bg-surface p-8 shadow-panel">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">ACCOUNT</p>
          <h1 className="mt-3 text-[32px] font-bold text-text-primary">Sign In</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Access your tools and usage history.
          </p>
        </header>

        <AuthConfigNotice className="mt-5" />

        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            Continue with Google
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">
            Or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md bg-bg-secondary p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('magic-link')
              setError('')
              setMessage('')
            }}
            aria-pressed={authMode === 'magic-link'}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              authMode === 'magic-link'
                ? 'bg-surface text-text-primary shadow-card'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password')
              setError('')
              setMessage('')
            }}
            aria-pressed={authMode === 'password'}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              authMode === 'password'
                ? 'bg-surface text-text-primary shadow-card'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Password
          </button>
        </div>

        {error && (
          <div
            id={statusMessageId}
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            id={statusMessageId}
            role="status"
            aria-live="polite"
            className="mt-4 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success"
          >
            {message}
          </div>
        )}

        {authMode === 'magic-link' ? (
          <form onSubmit={handleMagicLink} className="mt-6 space-y-5">
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

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send Magic Link
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email-password"
                className="block text-sm font-semibold text-text-primary"
              >
                Email Address
              </label>
              <input
                id="email-password"
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

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-text-primary">
                Password
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

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/signup')}
              disabled={isLoading}
            >
              Create Account with Email + Password
            </Button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm font-medium text-accent">
                Forgot password?
              </Link>
            </div>
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
        <p className="mt-3 text-center text-sm text-text-secondary">
          Need an account?{' '}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            Create one
          </Link>
        </p>
      </div>
    </section>
  )
}
