'use client'

import { isSupabaseConfigured } from '@/lib/supabase/client'

interface AuthConfigNoticeProps {
  className?: string
}

export default function AuthConfigNotice({ className = '' }: AuthConfigNoticeProps) {
  if (isSupabaseConfigured()) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error ${className}`.trim()}
    >
      Authentication is temporarily unavailable due to a configuration issue.
    </div>
  )
}
