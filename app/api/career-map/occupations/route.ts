import { NextRequest, NextResponse } from 'next/server'
import { searchOccupationsWithWages } from '@/lib/server/careerData'

export const dynamic = 'force-dynamic'

function parseRegion(value: string | null): 'CA' | 'US' | undefined {
  if (!value) return undefined
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CA' || normalized === 'US') {
    return normalized
  }
  return undefined
}

function parseLimit(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const q = params.get('q') ?? ''
    const region = parseRegion(params.get('region'))
    const wageRegion = params.get('wageRegion') ?? undefined
    const limit = parseLimit(params.get('limit'))

    const result = await searchOccupationsWithWages({
      query: q,
      region,
      wageRegion,
      limit
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Career map occupations query failed:', error)
    return NextResponse.json(
      {
        error: 'QUERY_FAILED',
        message: 'Unable to query occupations right now.'
      },
      { status: 500 }
    )
  }
}
