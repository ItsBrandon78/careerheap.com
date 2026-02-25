import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv(path) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
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

async function fetchUsdCadFromBoC() {
  const endpoint = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1'
  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'careerheap-fx-seed/1.0'
    }
  })
  if (!response.ok) {
    throw new Error(`Bank of Canada request failed: HTTP ${response.status}`)
  }
  const payload = await response.json()
  const observation = payload?.observations?.[0]
  const date = observation?.d
  const value = Number.parseFloat(observation?.FXUSDCAD?.v ?? '')
  if (!date || !Number.isFinite(value) || value <= 0) {
    throw new Error('Unable to parse FXUSDCAD from Bank of Canada response.')
  }
  return {
    asOfDate: date,
    rate: value,
    source: 'Bank of Canada Valet API (FXUSDCAD)'
  }
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

  const fx = await fetchUsdCadFromBoC()
  const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { error } = await supabase.from('fx_rates').upsert(
    {
      base_currency: 'USD',
      quote_currency: 'CAD',
      rate: fx.rate,
      source: fx.source,
      as_of_date: fx.asOfDate
    },
    {
      onConflict: 'base_currency,quote_currency,as_of_date'
    }
  )
  if (error) throw error

  console.log('[fx] seeded USD/CAD')
  console.log(`- as_of_date: ${fx.asOfDate}`)
  console.log(`- rate: ${fx.rate}`)
}

main().catch((error) => {
  console.error('[fx] failed')
  if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST205') {
    console.error(
      'Career planner execution schema is missing. Apply migrations through `migrations/006_career_map_planner_execution_core.sql` first.'
    )
  } else {
    console.error(error instanceof Error ? error.message : error)
  }
  process.exit(1)
})
