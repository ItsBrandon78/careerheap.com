import { NextRequest, NextResponse } from 'next/server'
import {
  getMissingCoreEnv,
  getMissingSanityEnv,
  getMissingStripeEnv,
  getMissingStripeWebhookEnv
} from '@/lib/server/envValidation'

export const dynamic = 'force-dynamic'

function present(...keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]?.trim()))
}

/**
 * Production readiness probe. Public response is non-sensitive (subsystem
 * booleans only). Pass `?detail=<DEV_ADMIN_TOKEN>` to see exactly which env
 * vars are missing. Use this after deploy / before flipping to live payments.
 */
export async function GET(request: NextRequest) {
  const subsystems = {
    supabase: getMissingCoreEnv(),
    stripe_checkout: getMissingStripeEnv(),
    stripe_webhook: getMissingStripeWebhookEnv(),
    sanity: getMissingSanityEnv(),
    openai: present('OPENAI_API_KEY') ? [] : ['OPENAI_API_KEY'],
    market_data_adzuna: present('ADZUNA_APP_ID', 'ADZUNA_APP_KEY')
      ? []
      : ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY']
  }

  // OpenAI + Adzuna degrade gracefully (template fallback / baseline data), so
  // they are "recommended", not hard blockers for the app to boot.
  const blockers = ['supabase', 'stripe_checkout', 'stripe_webhook'] as const
  const ready = blockers.every((key) => subsystems[key].length === 0)

  const ready_map = Object.fromEntries(
    Object.entries(subsystems).map(([key, missing]) => [key, missing.length === 0])
  )

  const adminToken = process.env.DEV_ADMIN_TOKEN?.trim()
  const wantsDetail =
    adminToken && request.nextUrl.searchParams.get('detail')?.trim() === adminToken

  return NextResponse.json(
    {
      ok: ready,
      ready: ready_map,
      ...(wantsDetail ? { missing: subsystems } : {}),
      timestamp: new Date().toISOString()
    },
    { status: ready ? 200 : 503 }
  )
}
