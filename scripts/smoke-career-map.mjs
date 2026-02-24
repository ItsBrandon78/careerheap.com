import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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

function parseBaseUrl() {
  const arg = process.argv.find((item) => item.startsWith('--base-url='))
  if (!arg) return 'http://127.0.0.1:3000'
  return arg.slice('--base-url='.length)
}

function fail(message) {
  throw new Error(message)
}

async function assertServerReachable(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/usage/summary`, { method: 'GET' })
    if (!response.ok) return
  } catch {
    fail(`Cannot reach dev server at ${baseUrl}. Start it first (npm run dev).`)
  }
}

async function createAuthSession(args) {
  const { admin, authClient, plan } = args
  const local = randomUUID().slice(0, 8)
  const email = `smoke-${plan}-${Date.now()}-${local}@careerheap.local`
  const password = `CareerHeap!${randomUUID().slice(0, 10)}`

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (createError || !created?.user?.id) {
    fail(`Unable to create ${plan} smoke user: ${createError?.message ?? 'unknown error'}`)
  }

  const userId = created.user.id

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      plan: plan === 'pro' ? 'pro' : 'free',
      free_uses_used: 0,
      stripe_subscription_status: plan === 'pro' ? 'active' : null
    },
    { onConflict: 'id' }
  )
  if (profileError) {
    fail(`Unable to seed profile for ${email}: ${profileError.message}`)
  }

  await admin
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        subscription_tier: plan === 'pro' ? 'pro' : 'free'
      },
      { onConflict: 'id' }
    )
    .then(() => null)
    .catch(() => null)

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password
  })
  if (signInError || !signInData?.session?.access_token) {
    fail(`Unable to sign in ${email}: ${signInError?.message ?? 'missing session token'}`)
  }

  return {
    userId,
    email,
    accessToken: signInData.session.access_token
  }
}

async function callPlanner(baseUrl, accessToken, payload) {
  const response = await fetch(`${baseUrl}/api/tools/career-switch-planner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function countReports(admin, userId) {
  const { count, error } = await admin
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (!error) return count ?? 0

  const fallback = await admin
    .from('career_map_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (fallback.error) return 0
  return fallback.count ?? 0
}

async function callResumeParse(baseUrl, accessToken) {
  const form = new FormData()
  form.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'resume.txt')
  const response = await fetch(`${baseUrl}/api/resume/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  })
  const json = await response.json().catch(() => null)
  return { status: response.status, json }
}

async function cleanupUsers(admin, ids) {
  for (const id of ids) {
    if (!id) continue
    await admin.auth.admin.deleteUser(id).catch(() => null)
  }
}

async function main() {
  loadEnv('.env')
  loadEnv('.env.local')

  const baseUrl = parseBaseUrl()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !serviceRole || !anonKey) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
  }

  await assertServerReachable(baseUrl)

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const createdIds = []
  try {
    const freeUser = await createAuthSession({ admin, authClient, plan: 'free' })
    createdIds.push(freeUser.userId)

    const proUser = await createAuthSession({ admin, authClient, plan: 'pro' })
    createdIds.push(proUser.userId)

    const plannerPayload = {
      currentRole: 'Customer Success Specialist',
      targetRole: 'Product Operations Manager',
      notSureMode: false,
      experienceText:
        'Managed onboarding programs for enterprise customers, improved retention by 14%, and built KPI dashboards for cross-functional teams with weekly reporting.',
      location: 'Toronto, ON, Canada',
      timeline: '1-3 months',
      education: "Bachelor's"
    }

    const freeCall1 = await callPlanner(baseUrl, freeUser.accessToken, plannerPayload)
    if (freeCall1.status !== 200) {
      fail(`Free user first planner call failed. status=${freeCall1.status}`)
    }

    const persistedReports = await countReports(admin, freeUser.userId)
    if (persistedReports < 1) {
      fail('Free user first planner call did not persist a report.')
    }

    const freeCall2 = await callPlanner(baseUrl, freeUser.accessToken, plannerPayload)
    if (freeCall2.status !== 402) {
      fail(`Free user second planner call should be locked. status=${freeCall2.status}`)
    }

    const proCall1 = await callPlanner(baseUrl, proUser.accessToken, plannerPayload)
    const proCall2 = await callPlanner(baseUrl, proUser.accessToken, plannerPayload)
    if (proCall1.status !== 200 || proCall2.status !== 200) {
      fail(
        `Pro user planner calls must succeed. statuses=${proCall1.status},${proCall2.status}`
      )
    }

    const score1 = Number(proCall1.json?.scoring?.total_score)
    const score2 = Number(proCall2.json?.scoring?.total_score)
    if (!Number.isFinite(score1) || !Number.isFinite(score2)) {
      fail('Pro planner response missing deterministic scoring.total_score.')
    }
    if (score1 !== score2) {
      fail(`Deterministic scoring failed. score1=${score1} score2=${score2}`)
    }

    const proResumeParse = await callResumeParse(baseUrl, proUser.accessToken)
    if (proResumeParse.status === 401 || proResumeParse.status === 402) {
      fail(`Pro resume parse was blocked unexpectedly. status=${proResumeParse.status}`)
    }

    console.log('[smoke-career-map] ok')
    console.log(`- free first call: ${freeCall1.status}`)
    console.log(`- free second call locked: ${freeCall2.status}`)
    console.log(`- pro deterministic score: ${score1}`)
    console.log(`- pro resume parse allowed status: ${proResumeParse.status}`)
  } finally {
    await cleanupUsers(admin, createdIds)
  }
}

main().catch((error) => {
  console.error('[smoke-career-map] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
