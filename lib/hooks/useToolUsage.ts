import { useCallback, useState } from 'react'

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
  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(errorData?.error ?? 'Usage request failed')
  }
  return (await response.json()) as ToolUsageResult
}

export function useToolUsage() {
  const [isChecking, setIsChecking] = useState(false)
  const [isConsuming, setIsConsuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUsage = useCallback(async (toolSlug: string, search?: string): Promise<ToolUsageResult | null> => {
    setIsChecking(true)
    setError(null)

    try {
      const response = await fetch(`/api/tools/${toolSlug}${buildSearch(search)}`, {
        method: 'GET',
        cache: 'no-store'
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
      const response = await fetch(`/api/tools/${toolSlug}${buildSearch(search)}`, {
        method: 'POST',
        cache: 'no-store'
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
