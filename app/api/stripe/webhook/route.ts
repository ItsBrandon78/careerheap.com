import { NextRequest } from 'next/server'
import { handleStripeWebhook } from '@/lib/server/stripeWebhook'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request)
}
