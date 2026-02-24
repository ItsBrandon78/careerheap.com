'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

export type PlanType = 'free' | 'pro' | 'lifetime'

export interface UsageSummary {
  plan: PlanType
  isUnlimited: boolean
  canUse: boolean
  used: number
  limit: number
  usesRemaining: number | null
  byTool: Record<string, number>
}

interface AuthContextType {
  user: User | null
  plan: PlanType
  subscriptionStatus: string | null
  usage: UsageSummary | null
  isLoading: boolean
  isAuthenticated: boolean
  isUnlimited: boolean
  signOut: () => Promise<void>
  refreshUsage: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizePlan(value: unknown): PlanType {
  if (value === 'pro' || value === 'lifetime') return value
  return 'free'
}

function createFallbackUsage(plan: PlanType): UsageSummary {
  return {
    plan,
    isUnlimited: false,
    canUse: true,
    used: 0,
    limit: 3,
    usesRemaining: 3,
    byTool: {}
  }
}

async function fetchUsageSummary(search = '') {
  try {
    const authHeaders = await getSupabaseAuthHeaders()
    const response = await fetch(`/api/usage/summary${search}`, {
      cache: 'no-store',
      headers: authHeaders
    })
    if (!response.ok) return null
    return (await response.json()) as UsageSummary
  } catch {
    return null
  }
}

function getUsageOverrideSearch() {
  if (typeof window === 'undefined') return ''

  // Keep QA overrides scoped to tool routes only so checkout/account query params
  // (e.g. /checkout?plan=pro) do not spoof global auth plan state.
  if (!window.location.pathname.startsWith('/tools')) {
    return ''
  }

  const params = new URLSearchParams(window.location.search)
  const override = new URLSearchParams()
  const plan = params.get('plan')
  const uses = params.get('uses')
  if (plan) override.set('plan', plan)
  if (uses) override.set('uses', uses)
  const query = override.toString()
  return query ? `?${query}` : ''
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<PlanType>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfilePlan = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setPlan('free')
      setSubscriptionStatus(null)
      return 'free' as const
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('plan,stripe_subscription_status')
        .eq('id', nextUser.id)
        .single()
      if (error) {
        const fallback = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', nextUser.id)
          .single()

        const fallbackPlan = normalizePlan(fallback.data?.plan)
        setPlan(fallbackPlan)
        setSubscriptionStatus(null)
        return fallbackPlan
      }
      const nextPlan = normalizePlan(data?.plan)
      setPlan(nextPlan)
      setSubscriptionStatus(
        typeof data?.stripe_subscription_status === 'string'
          ? data.stripe_subscription_status
          : null
      )
      return nextPlan
    } catch {
      setPlan('free')
      setSubscriptionStatus(null)
      return 'free' as const
    }
  }, [])

  const refreshUsage = useCallback(async () => {
    const search = getUsageOverrideSearch()
    const summary = await fetchUsageSummary(search)
    if (summary) {
      setUsage(summary)
      setPlan(normalizePlan(summary.plan))
    }
  }, [])

  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      const nextPlan = await loadProfilePlan(nextUser)

      const search = getUsageOverrideSearch()
      const summary = await fetchUsageSummary(search)
      if (summary) {
        setUsage(summary)
        setPlan(normalizePlan(summary.plan))
      } else if (!nextUser) {
        setUsage(createFallbackUsage(nextPlan))
      }

      setIsLoading(false)
    },
    [loadProfilePlan]
  )

  useEffect(() => {
    let mounted = true

    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      queueMicrotask(() => {
        void applySession(null)
      })

      return () => {
        mounted = false
      }
    }

    const bootstrap = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return
      await applySession(session)
    }

    void bootstrap()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      void applySession(session)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // noop: keeps logout UX stable even when auth client is unavailable
    }
    setUser(null)
    setPlan('free')
    setSubscriptionStatus(null)
    setUsage(createFallbackUsage('free'))
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      plan,
      subscriptionStatus,
      usage,
      isLoading,
      isAuthenticated: Boolean(user),
      isUnlimited: plan === 'pro' || plan === 'lifetime',
      signOut,
      refreshUsage
    }),
    [user, plan, subscriptionStatus, usage, isLoading, signOut, refreshUsage]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
