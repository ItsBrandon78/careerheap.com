'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [authMode, setAuthMode] = useState<'magic-link' | 'password'>('magic-link')
  const router = useRouter()

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
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signInError) throw signInError

      if (data?.session) {
        router.push('/')
        return
      }

      setMessage('Check your email for a magic link to log in.')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignUp = async () => {
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) throw signUpError

      setMessage('Check your email to confirm your account.')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
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
          <p className="mt-2 text-sm text-text-secondary">Access your tools and usage history.</p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-md bg-bg-secondary p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('magic-link')
              setError('')
              setMessage('')
            }}
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
          <div className="mt-4 rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success">
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
              <label htmlFor="email-password" className="block text-sm font-semibold text-text-primary">
                Email Address
              </label>
              <input
                id="email-password"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                placeholder="********"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>

            <button
              type="button"
              onClick={handlePasswordSignUp}
              disabled={isLoading || !email || !password}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-secondary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Account with Email + Password
            </button>
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
      </div>
    </section>
  )
}
