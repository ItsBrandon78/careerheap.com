'use client'

import { getSupabasePublicEnvStatus, isSupabasePublicEnvConfigured } from '@/lib/supabase/publicEnv'

interface AuthConfigNoticeProps {
  className?: string
}

export default function AuthConfigNotice({ className = '' }: AuthConfigNoticeProps) {
  const status = getSupabasePublicEnvStatus()

  if (isSupabasePublicEnvConfigured()) {
    return null
  }

  const missingParts: string[] = []
  if (!status.hasUrl) missingParts.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!status.hasKey) {
    missingParts.push(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error ${className}`.trim()}
    >
      Authentication is temporarily unavailable due to a configuration issue.
      {missingParts.length > 0 ? (
        <div className="mt-1 text-xs text-error/90">
          Missing: {missingParts.join(', ')}
        </div>
      ) : null}
    </div>
  )
}
