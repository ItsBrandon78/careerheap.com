import { useCallback, useState } from 'react'
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

export type PlanType = 'free' | 'pro' | 'lifetime'

export interface ToolUsageResult {
  plan: PlanType
  canUse: boolean
  isUnlimited: boolean
  used: number
  limit: number
  usesRemaining: number | null
  byTool: Record<string, number>
}

function buildSearch(search?: string) {
  if (!search) return ''
  return search.startsWith('?') ? search : `?${search}`
}

async function parseUsageResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as
    | {
        error?: string
        message?: string
        usage?: ToolUsageResult
      }
    | null

  if (response.status === 402 && data?.usage) {
    return data.usage
  }

  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? 'Usage request failed')
  }

  return data as ToolUsageResult
}

export function useToolUsage() {
  const [isChecking, setIsChecking] = useState(false)
  const [isConsuming, setIsConsuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUsage = useCallback(async (toolSlug: string, search?: string): Promise<ToolUsageResult | null> => {
    setIsChecking(true)
    setError(null)

    try {
      const authHeaders = await getSupabaseAuthHeaders()
      const response = await fetch(`/api/tools/${toolSlug}${buildSearch(search)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: authHeaders
      })
      return await parseUsageResponse(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsChecking(false)
    }
  }, [])

  const consumeUsage = useCallback(async (toolSlug: string, search?: string): Promise<ToolUsageResult | null> => {
    setIsConsuming(true)
    setError(null)

    try {
      const authHeaders = await getSupabaseAuthHeaders()
      const response = await fetch(`/api/tools/${toolSlug}${buildSearch(search)}`, {
        method: 'POST',
        cache: 'no-store',
        headers: authHeaders
      })
      return await parseUsageResponse(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsConsuming(false)
    }
  }, [])

  return {
    getUsage,
    consumeUsage,
    isChecking,
    isConsuming,
    error
  }
}
