import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const REQUIRED_TABLES = [
  'dataset_sources',
  'occupations',
  'occupation_skills',
  'occupation_wages',
  'trade_requirements',
  'reports',
  'resumes',
  'fx_rates'
]

function loadEnv(path) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const split = line.indexOf('=')
    if (split === -1) continue
    const key = line.slice(0, split).trim()
    let value = line.slice(split + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function dateDaysAgo(days) {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - days)
  return now
}

async function ensureTablesExist(supabase) {
  const missing = []
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error && error.code === 'PGRST205') {
      missing.push(table)
      continue
    }
    if (error) {
      throw new Error(`${table}: ${error.message}`)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required table(s): ${missing.join(', ')}. Apply migrations through migrations/006_career_map_planner_execution_core.sql.`
    )
  }
}

async function readExactCount(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    throw new Error(`${table} count failed: ${error.message}`)
  }
  return count ?? 0
}

async function main() {
  loadEnv('.env')
  loadEnv('.env.local')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !adminKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or admin key env (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY).'
    )
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  await ensureTablesExist(supabase)

  const [occupationsCount, occupationSkillsCount, occupationWagesCount, tradeRequirementsCount] =
    await Promise.all([
      readExactCount(supabase, 'occupations'),
      readExactCount(supabase, 'occupation_skills'),
      readExactCount(supabase, 'occupation_wages'),
      readExactCount(supabase, 'trade_requirements')
    ])

  if (occupationsCount <= 0) {
    throw new Error('occupations is empty. Run: npm run ingest:career-data -- --all --write')
  }
  if (occupationSkillsCount <= 0) {
    throw new Error('occupation_skills is empty. Run: npm run ingest:career-data -- --all --write')
  }
  if (occupationWagesCount <= 0) {
    throw new Error('occupation_wages is empty. Run: npm run ingest:career-data -- --all --write')
  }

  const stoEnabled = process.env.CAREER_STO_ENABLED !== '0'
  if (stoEnabled && tradeRequirementsCount <= 0) {
    throw new Error(
      'trade_requirements is empty while CAREER_STO_ENABLED is on. Run: npm run ingest:career-data -- --source=sto --write'
    )
  }

  const { data: fxRow, error: fxError } = await supabase
    .from('fx_rates')
    .select('base_currency,quote_currency,rate,source,as_of_date')
    .eq('base_currency', 'USD')
    .eq('quote_currency', 'CAD')
    .order('as_of_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fxError) {
    throw new Error(`fx_rates check failed: ${fxError.message}`)
  }
  if (!fxRow) {
    throw new Error('fx_rates has no USD/CAD row. Run: npm run seed:fx-rates')
  }

  const fxDate = new Date(`${fxRow.as_of_date}T00:00:00Z`)
  if (Number.isNaN(fxDate.getTime())) {
    throw new Error(`fx_rates latest as_of_date is invalid: ${fxRow.as_of_date}`)
  }
  const staleThreshold = dateDaysAgo(14)
  if (fxDate < staleThreshold) {
    throw new Error(
      `fx_rates USD/CAD is stale (${fxRow.as_of_date}). Refresh with: npm run seed:fx-rates`
    )
  }

  console.log('[planner-preflight] ok')
  console.log(`- occupations: ${occupationsCount}`)
  console.log(`- occupation_skills: ${occupationSkillsCount}`)
  console.log(`- occupation_wages: ${occupationWagesCount}`)
  console.log(`- trade_requirements: ${tradeRequirementsCount}`)
  console.log(`- fx_rates USD/CAD: ${fxRow.rate} (${fxRow.as_of_date})`)
}

main().catch((error) => {
  console.error('[planner-preflight] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
