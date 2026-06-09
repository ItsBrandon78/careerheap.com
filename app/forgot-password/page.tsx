'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import Card from '@/components/Card'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackUrl } from '@/lib/supabase/authRedirect'
import { useT } from '@/lib/i18n/LocaleProvider'

function formatResetError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '').trim()
      : ''
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN

  const cooldownMatch = message.match(/after\s+(\d+)\s+seconds?/i)
  const cooldownSeconds = cooldownMatch?.[1] ? Number(cooldownMatch[1]) : NaN

  if (status === 429 || /only request this after/i.test(message)) {
    return {
      message: 'Too many reset requests. Wait about a minute, then try again.',
      messageFr: 'Trop de demandes de réinitialisation. Attendez environ une minute, puis réessayez.',
      cooldownSeconds:
        Number.isFinite(cooldownSeconds) && cooldownSeconds > 0
          ? Math.min(300, Math.round(cooldownSeconds))
          : 60
    }
  }
  if (/redirect url.*not allowed/i.test(message)) {
    return {
      message: 'Reset link configuration is invalid for this environment. Contact support.',
      messageFr: 'La configuration du lien de réinitialisation est invalide pour cet environnement. Contactez le soutien.',
      cooldownSeconds: 0
    }
  }
  if (/failed to fetch|networkerror/i.test(message)) {
    return {
      message: 'Network error. Check your connection and try again.',
      messageFr: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
      cooldownSeconds: 0
    }
  }
  return {
    message: message || 'Unable to process your request right now.',
    messageFr: message || 'Impossible de traiter votre demande pour le moment.',
    cooldownSeconds: 0
  }
}

function shouldLogResetError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '').trim()
      : ''
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN

  if (status === 429 || /only request this after|email rate limit exceeded/i.test(message)) {
    return false
  }
  return true
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)
  const router = useRouter()
  const t = useT()
  const statusMessageId = 'forgot-password-status-message'

  useEffect(() => {
    if (retryAfterSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((current) => (current <= 1 ? 0 : current - 1))
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [retryAfterSeconds])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (retryAfterSeconds > 0) {
      setError(t(`Too many reset requests. Try again in ${retryAfterSeconds}s.`, `Trop de demandes de réinitialisation. Réessayez dans ${retryAfterSeconds} s.`))
      return
    }

    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = getAuthCallbackUrl({ next: '/reset-password' })
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })

      if (resetError) {
        const feedback = formatResetError(resetError)
        setError(t(feedback.message, feedback.messageFr))
        if (feedback.cooldownSeconds > 0) {
          setRetryAfterSeconds(feedback.cooldownSeconds)
        }
        return
      }
      setMessage(
        t(
          'If an account exists for this email, you will receive a password reset link.',
          'Si un compte existe pour ce courriel, vous recevrez un lien de réinitialisation du mot de passe.'
        )
      )
      setRetryAfterSeconds(0)
      setEmail('')
    } catch (submitError) {
      if (process.env.NODE_ENV !== 'production' && shouldLogResetError(submitError)) {
        console.error('Forgot password request failed:', submitError)
      }
      const feedback = formatResetError(submitError)
      setError(t(feedback.message, feedback.messageFr))
      if (feedback.cooldownSeconds > 0) {
        setRetryAfterSeconds(feedback.cooldownSeconds)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <Card className="mx-auto w-full max-w-[460px] p-8 shadow-panel">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">{t('ACCOUNT SECURITY', 'SÉCURITÉ DU COMPTE')}</p>
          <h1 className="mt-3 text-[30px] font-bold text-text-primary">{t('Forgot your password?', 'Mot de passe oublié?')}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t(
              "Enter your email and we'll send reset instructions if an account exists.",
              'Entrez votre courriel et nous enverrons les instructions de réinitialisation si un compte existe.'
            )}
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
              {t(
                'Check your inbox and spam folder. The link may take a minute to arrive.',
                'Vérifiez votre boîte de réception et vos pourriels. Le lien peut prendre une minute à arriver.'
              )}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              {t('Back to sign in', 'Retour à la connexion')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary">
                {t('Email Address', 'Adresse courriel')}
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
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={retryAfterSeconds > 0}
              >
                {retryAfterSeconds > 0
                  ? t(`Try again in ${retryAfterSeconds}s`, `Réessayez dans ${retryAfterSeconds} s`)
                  : t('Send reset link', 'Envoyer le lien de réinitialisation')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                {t('Back to sign in', 'Retour à la connexion')}
              </Button>
            </div>
            <p className="text-sm text-text-secondary">
              {t(
                'Check your spam folder if you do not see the reset email.',
                'Vérifiez vos pourriels si vous ne voyez pas le courriel de réinitialisation.'
              )}
            </p>
            {retryAfterSeconds > 0 ? (
              <p className="text-sm text-text-tertiary">
                {t(
                  `For security, reset emails are rate-limited. You can request another link in ${retryAfterSeconds}s.`,
                  `Pour des raisons de sécurité, les courriels de réinitialisation sont limités. Vous pourrez demander un autre lien dans ${retryAfterSeconds} s.`
                )}
              </p>
            ) : null}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-secondary">
          {t('By continuing, you agree to our', 'En continuant, vous acceptez nos')}{' '}
          <Link href="/terms" className="text-accent hover:text-accent-hover">
            {t('Terms', 'Conditions')}
          </Link>{' '}
          {t('and', 'et')}{' '}
          <Link href="/privacy" className="text-accent hover:text-accent-hover">
            {t('Privacy Policy', 'Politique de confidentialité')}
          </Link>
          .
        </p>
      </Card>
    </section>
  )
}
