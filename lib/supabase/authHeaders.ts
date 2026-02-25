'use client'

import { createClient } from '@/lib/supabase/client'

export async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient()
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return {}
    }

    return {
      Authorization: `Bearer ${session.access_token}`
    }
  } catch {
    return {}
  }
}
