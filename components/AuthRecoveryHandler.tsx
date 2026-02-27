'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

function safeHashParams() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash || hash.length < 2) return null
  return new URLSearchParams(hash.slice(1))
}

function safeSearchParams() {
  if (typeof window === 'undefined') return null
  const search = window.location.search
  if (!search || search.length < 2) return null
  return new URLSearchParams(search.slice(1))
}

export default function AuthRecoveryHandler() {
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    const params = safeHashParams() ?? safeSearchParams()
    if (!params) return

    const type = params.get('type')
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (type !== 'recovery' || !accessToken || !refreshToken) return
    handledRef.current = true

    void (async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (error) throw error
        window.location.replace('/reset-password')
      } catch {
        window.location.replace('/login?auth_error=recovery_session_failed&next=/reset-password')
      }
    })()
  }, [])

  return null
}
