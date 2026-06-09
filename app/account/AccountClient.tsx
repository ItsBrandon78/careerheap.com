'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { useAuth } from '@/lib/auth/context'
import { useT } from '@/lib/i18n/LocaleProvider'
import { createClient } from '@/lib/supabase/client'

type AccountTab = 'profile' | 'security' | 'billing' | 'usage'

function tabFromQuery(value: string | null): AccountTab {
  if (value === 'security' || value === 'billing' || value === 'usage') return value
  return 'profile'
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

  const { user, plan, subscriptionStatus, usage, isLoading, signOut, isUnlimited, refreshUsage } =
    useAuth()
  const t = useT()
  const [fullName, setFullName] = useState('')
  const [toast, setToast] = useState('')
  const [securityError, setSecurityError] = useState('')
  const [securityLoading, setSecurityLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingSyncLoading, setBillingSyncLoading] = useState(false)
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

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.')
      return
    }

    if (!currentPassword) {
      setSecurityError('Enter your current password.')
      return
    }

    setSecurityLoading(true)
    setSecurityError('')
    try {
      const supabase = createClient()
      const signInResult = await supabase.auth.signInWithPassword({
        email: user.email ?? '',
        password: currentPassword
      })
      if (signInResult.error) {
        throw new Error('Could not verify your current password.')
      }

      const updateResult = await supabase.auth.updateUser({ password: newPassword })
      if (updateResult.error) {
        throw new Error('Unable to update your password right now.')
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setToast(t('Password updated.', 'Mot de passe mis à jour.'))
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : t('Unable to update password.', 'Impossible de mettre à jour le mot de passe.'))
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setBillingError('')
    setBillingLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Unable to open billing portal.')
      }
      window.location.href = data.url
    } catch (error) {
      setBillingError(
        error instanceof Error ? error.message : 'Unable to open billing portal.'
      )
    } finally {
      setBillingLoading(false)
    }
  }

  const handlePrimaryBillingAction = async () => {
    if (plan === 'free') {
      router.push('/pricing')
      return
    }

    await handleManageBilling()
  }

  const handleSyncBillingStatus = async () => {
    setBillingError('')
    setBillingSyncLoading(true)
    try {
      const response = await fetch('/api/stripe/sync-latest', { method: 'POST' })
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Unable to sync billing status.')
      }

      await refreshUsage()
      setToast(t('Billing status synced.', 'Statut de facturation synchronisé.'))
    } catch (error) {
      setBillingError(
        error instanceof Error ? error.message : 'Unable to sync billing status.'
      )
    } finally {
      setBillingSyncLoading(false)
    }
  }

  const renderTab = () => {
    if (tab === 'security') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">{t('Security', 'Sécurité')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('Update your password to keep your account secure.', 'Mettez à jour votre mot de passe pour protéger votre compte.')}</p>

          {securityError && (
            <p
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error"
            >
              {securityError}
            </p>
          )}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">{t('Current password', 'Mot de passe actuel')}</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">{t('New password', 'Nouveau mot de passe')}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">{t('Confirm new password', 'Confirmer le nouveau mot de passe')}</span>
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
              onClick={handlePasswordUpdate}
              isLoading={securityLoading}
              disabled={securityLoading}
            >
              {t('Update Password', 'Mettre à jour le mot de passe')}
            </Button>
            <Link href="/forgot-password" className="text-sm font-medium text-accent">
              {t('Forgot password?', 'Mot de passe oublié?')}
            </Link>
          </div>
        </Card>
      )
    }

    if (tab === 'billing') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">{t('Billing', 'Facturation')}</h2>
          {plan === 'free' ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">{t('Current plan: Free', 'Forfait actuel : Gratuit')}</p>
              <p className="text-sm text-text-secondary">
                {t('No payment method or subscription history yet.', 'Aucun mode de paiement ni historique d’abonnement pour l’instant.')}
              </p>
              <p className="text-sm text-text-secondary">
                {t(`You have used ${usage?.used ?? 0} of ${usage?.limit ?? 3} lifetime uses.`, `Vous avez utilisé ${usage?.used ?? 0} de ${usage?.limit ?? 3} essais à vie.`)}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/pricing">
                  <Button variant="primary">{t('See Plans', 'Voir les forfaits')}</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleSyncBillingStatus}
                  isLoading={billingSyncLoading}
                  disabled={billingSyncLoading}
                >
                  {t('Sync Billing Status', 'Synchroniser la facturation')}
                </Button>
              </div>
            </div>
          ) : plan === 'pro' ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">{t('Current plan: Pro', 'Forfait actuel : Pro')}</p>
              <p className="text-sm text-text-secondary">
                {t('Subscription status:', 'Statut de l’abonnement :')} {subscriptionStatus || 'active'}
              </p>
              <p className="text-sm text-text-secondary">
                {t('Payment method details and invoice history are managed in Stripe Billing Portal.', 'Le mode de paiement et l’historique des factures sont gérés dans le portail de facturation Stripe.')}
              </p>
              {billingError ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error"
                >
                  {billingError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={handleManageBilling}
                  isLoading={billingLoading}
                  disabled={billingLoading}
                >
                  {t('Manage Billing', 'Gérer la facturation')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSyncBillingStatus}
                  isLoading={billingSyncLoading}
                  disabled={billingSyncLoading}
                >
                  {t('Sync Billing Status', 'Synchroniser la facturation')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-text-secondary">{t('Current plan: Lifetime', 'Forfait actuel : À vie')}</p>
              <p className="text-sm text-text-secondary">{t('No renewal. Your access is permanent.', 'Aucun renouvellement. Votre accès est permanent.')}</p>
              <p className="text-sm text-text-secondary">
                {t('Purchase receipts and payment details are available from Stripe emails.', 'Les reçus d’achat et les détails de paiement sont disponibles dans les courriels Stripe.')}
              </p>
              <p className="rounded-md border border-success/20 bg-success-light px-3 py-2 text-sm text-success">
                {t('Thank you for supporting CareerHeap as an early adopter.', 'Merci de soutenir CareerHeap en tant qu’adopteur précoce.')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleSyncBillingStatus}
                  isLoading={billingSyncLoading}
                  disabled={billingSyncLoading}
                >
                  {t('Sync Billing Status', 'Synchroniser la facturation')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )
    }

    if (tab === 'usage') {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">{t('Usage', 'Utilisation')}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {isUnlimited ? t('Unlimited usage enabled on your plan.', 'Utilisation illimitée activée sur votre forfait.') : t(`${usage?.usesRemaining ?? 3} of 3 lifetime uses left.`, `${usage?.usesRemaining ?? 3} de 3 essais à vie restants.`)}
          </p>
          <div className="mt-5 space-y-2">
            {usageRows.map(([slug, count]) => (
              <div key={slug} className="flex items-center justify-between rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm">
                <span className="capitalize text-text-secondary">{slug.replace(/-/g, ' ')}</span>
                <span className="font-semibold text-text-primary">{isUnlimited ? t('Unlimited', 'Illimité') : count}</span>
              </div>
            ))}
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">{t('Profile', 'Profil')}</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">{t('Full name', 'Nom complet')}</span>
              <input
                type="text"
                value={effectiveFullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-bg-primary px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-primary">{t('Email', 'Courriel')}</span>
              <input
                type="email"
                value={user.email ?? ''}
                readOnly
                className="mt-2 w-full rounded-md border border-border bg-bg-secondary px-4 py-3 text-sm text-text-secondary"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setToast(t('Profile updated.', 'Profil mis à jour.'))}>
              {t('Save changes', 'Enregistrer les modifications')}
            </Button>
            <button type="button" className="text-sm font-medium text-accent">
              {t('Resend verification email', 'Renvoyer le courriel de vérification')}
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-text-primary">{t('Security', 'Sécurité')}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t('Manage password and session settings from one place.', 'Gérez le mot de passe et les paramètres de session au même endroit.')}
          </p>
          <div className="mt-4">
            <Link href="/account?tab=security">
              <Button variant="outline">{t('Open Security Settings', 'Ouvrir les paramètres de sécurité')}</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">{t('ACCOUNT', 'COMPTE')}</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">{t('Account Hub', 'Espace compte')}</h1>

        {toast && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success"
          >
            {toast}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="h-fit p-3">
            {([['profile', t('Profile', 'Profil')], ['security', t('Security', 'Sécurité')], ['billing', t('Billing', 'Facturation')], ['usage', t('Usage', 'Utilisation')]] as const).map(([item, label]) => (
              <Link
                key={item}
                href={`/account?tab=${item}`}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  tab === item ? 'bg-accent-light text-accent' : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {label}
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
                    <p className="text-lg font-semibold text-text-primary">{effectiveFullName || t('CareerHeap User', 'Utilisateur CareerHeap')}</p>
                    <p className="text-sm text-text-secondary">{t('You\'re signed in as:', 'Vous êtes connecté en tant que :')} {user.email}</p>
                  </div>
                </div>
                <Badge>{plan === 'lifetime' ? t('Lifetime', 'À vie') : plan === 'pro' ? 'Pro' : t('Free', 'Gratuit')}</Badge>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={handlePrimaryBillingAction}
                  isLoading={billingLoading}
                  disabled={billingLoading}
                >
                  {plan === 'free' ? t('See Plans', 'Voir les forfaits') : t('Manage Billing', 'Gérer la facturation')}
                </Button>
                <Button variant="outline" onClick={signOut}>
                  {t('Log out', 'Déconnexion')}
                </Button>
              </div>
              {billingError ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="mt-4 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error"
                >
                  {billingError}
                </p>
              ) : null}
            </Card>

            {renderTab()}
          </div>
        </div>
      </div>
    </section>
  )
}
