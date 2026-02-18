'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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

async function fetchUsageSummary(search = '') {
  try {
    const response = await fetch(`/api/usage/summary${search}`, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as UsageSummary
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<PlanType>('free')
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfilePlan = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setPlan('free')
      return 'free' as const
    }

    try {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('plan').eq('id', nextUser.id).single()
      const nextPlan = normalizePlan(data?.plan)
      setPlan(nextPlan)
      return nextPlan
    } catch {
      setPlan('free')
      return 'free' as const
    }
  }, [])

  const refreshUsage = useCallback(async () => {
    const search = typeof window !== 'undefined' ? window.location.search : ''
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

      const search = typeof window !== 'undefined' ? window.location.search : ''
      const summary = await fetchUsageSummary(search)
      if (summary) {
        setUsage(summary)
        setPlan(normalizePlan(summary.plan))
      } else if (!nextUser) {
        setUsage({
          plan: nextPlan,
          isUnlimited: false,
          canUse: true,
          used: 0,
          limit: 3,
          usesRemaining: 3,
          byTool: {}
        })
      }

      setIsLoading(false)
    },
    [loadProfilePlan]
  )

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

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
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setPlan('free')
    setUsage(null)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      plan,
      usage,
      isLoading,
      isAuthenticated: Boolean(user),
      isUnlimited: plan === 'pro' || plan === 'lifetime',
      signOut,
      refreshUsage
    }),
    [user, plan, usage, isLoading, signOut, refreshUsage]
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
