import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REQUIRED_TABLES = [
  'occupations',
  'occupation_skills',
  'occupation_wages',
  'trade_requirements',
  'fx_rates'
]

async function tableExists(admin: ReturnType<typeof createAdminClient>, table: string) {
  const { error } = await admin.from(table).select('*').limit(1)
  if (!error) return true
  if (error.code === 'PGRST205') return false
  throw new Error(`${table}: ${error.message}`)
}

async function exactCount(admin: ReturnType<typeof createAdminClient>, table: string) {
  const { count, error } = await admin.from(table).select('*', { head: true, count: 'exact' })
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const requiredToken = process.env.DEV_ADMIN_TOKEN
  if (requiredToken) {
    const given = request.headers.get('x-dev-token')
    if (given !== requiredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const admin = createAdminClient()
    const missing: string[] = []
    for (const table of REQUIRED_TABLES) {
      const exists = await tableExists(admin, table)
      if (!exists) missing.push(table)
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_TABLES',
          message:
            `Missing required table(s): ${missing.join(', ')}. ` +
            'Apply migrations through migrations/006_career_map_planner_execution_core.sql.'
        },
        { status: 500 }
      )
    }

    const [occupations, occupationSkills, occupationWages, tradeRequirements] = await Promise.all([
      exactCount(admin, 'occupations'),
      exactCount(admin, 'occupation_skills'),
      exactCount(admin, 'occupation_wages'),
      exactCount(admin, 'trade_requirements')
    ])

    const { data: fxRow, error: fxError } = await admin
      .from('fx_rates')
      .select('base_currency,quote_currency,rate,source,as_of_date')
      .eq('base_currency', 'USD')
      .eq('quote_currency', 'CAD')
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fxError) {
      throw new Error(`fx_rates: ${fxError.message}`)
    }

    return NextResponse.json({
      ok: occupations > 0 && occupationSkills > 0 && occupationWages > 0 && Boolean(fxRow),
      counts: {
        occupations,
        occupation_skills: occupationSkills,
        occupation_wages: occupationWages,
        trade_requirements: tradeRequirements
      },
      fx_rate: fxRow
        ? {
            pair: `${fxRow.base_currency}/${fxRow.quote_currency}`,
            rate: fxRow.rate,
            source: fxRow.source,
            as_of_date: fxRow.as_of_date
          }
        : null
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'HEALTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Health check failed.'
      },
      { status: 500 }
    )
  }
}
