'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import AuthConfigNotice from '@/components/AuthConfigNotice'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/LocaleProvider'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const t = useT()
  const statusMessageId = 'reset-password-status-message'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError(t('New password must be at least 8 characters.', 'Le nouveau mot de passe doit comporter au moins 8 caractères.'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match.', 'Les mots de passe ne correspondent pas.'))
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setMessage(t('Password updated. Redirecting to your account...', 'Mot de passe mis à jour. Redirection vers votre compte...'))
      setTimeout(() => {
        router.replace('/account?tab=security')
      }, 800)
    } catch {
      setError(t('Could not reset password. Request a new reset link and try again.', "Impossible de réinitialiser le mot de passe. Demandez un nouveau lien et réessayez."))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto w-full max-w-[460px] rounded-lg border border-border bg-surface p-8 shadow-panel">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">{t('SECURITY', 'SÉCURITÉ')}</p>
          <h1 className="mt-3 text-[30px] font-bold text-text-primary">{t('Set New Password', 'Définir un nouveau mot de passe')}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('Choose a strong password for your account.', 'Choisissez un mot de passe robuste pour votre compte.')}
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
              {t('New password', 'Nouveau mot de passe')}
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
              {t('Confirm password', 'Confirmer le mot de passe')}
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
            {t('Update Password', 'Mettre à jour le mot de passe')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link href="/login" className="text-accent hover:text-accent-hover">
            {t('Back to login', 'Retour à la connexion')}
          </Link>
        </p>
      </div>
    </section>
  )
}
