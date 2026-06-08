'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import AuthShell from '@/components/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackUrl } from '@/lib/supabase/authRedirect'

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
        options: { redirectTo: getAuthCallbackUrl() }
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
        options: { emailRedirectTo: getAuthCallbackUrl() }
      })
      if (signUpError) throw signUpError

      if (data?.session) {
        router.push('/tools')
        return
      }
      setMessage('Account created. Check your email for verification instructions.')
      setPassword('')
    } catch {
      setError('Unable to create account right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      sub="Free to start — no credit card, 3 lifetime analyses included."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-accent">
            Log in
          </Link>
        </>
      }
    >
      <AuthConfigNotice className="mb-4" />

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignup}
        disabled={isLoading}
      >
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-text-tertiary">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {error && (
        <p
          id={statusMessageId}
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          id={statusMessageId}
          role="status"
          aria-live="polite"
          className="mb-4 rounded-md border border-success/20 bg-success-light px-3 py-2 text-sm text-success"
        >
          {message}
        </p>
      )}

      <form onSubmit={handleEmailSignup} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error || message ? statusMessageId : undefined}
            className="w-full rounded-md border border-border bg-surface px-[15px] py-3 text-[15px] focus:border-accent focus:outline-none"
            placeholder="you@email.com"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Password</span>
          <input
            id="signup-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error || message ? statusMessageId : undefined}
            className="w-full rounded-md border border-border bg-surface px-[15px] py-3 text-[15px] focus:border-accent focus:outline-none"
            placeholder="At least 8 characters"
          />
        </label>
        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-3.5 text-center text-xs leading-[1.5] text-text-tertiary">
        By continuing you agree to our{' '}
        <Link href="/terms" className="text-accent">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-accent">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  )
}
