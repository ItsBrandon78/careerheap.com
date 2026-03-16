import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'career-generation-50-report.json')

const CASES = [
  ['Cashier', 'Licensed Practical Nurse'],
  ['Cashier', 'Registered Nurse'],
  ['Cashier', 'Dental Hygienist'],
  ['Cashier', 'Pharmacy Technician'],
  ['Cashier', 'Accountant'],
  ['Cashier', 'Human Resources Manager'],
  ['Cashier', 'Operations Coordinator'],
  ['Cashier', 'Administrative Assistant'],
  ['Cashier', 'Software Developer'],
  ['Cashier', 'Data Scientist'],
  ['Retail Associate', 'Electrician'],
  ['Retail Associate', 'Millwright'],
  ['Retail Associate', 'Plumber'],
  ['Retail Associate', 'HVAC Technician'],
  ['Retail Associate', 'Carpenter'],
  ['Retail Associate', 'Cybersecurity Analyst'],
  ['Retail Associate', 'UX Designer'],
  ['Retail Associate', 'Project Coordinator'],
  ['Retail Associate', 'Customer Success Manager'],
  ['Retail Associate', 'Bookkeeper'],
  ['Warehouse Associate', 'Electrician (309A)'],
  ['Warehouse Associate', 'Industrial Electrician'],
  ['Warehouse Associate', 'Powerline Technician'],
  ['Warehouse Associate', 'Heavy Equipment Technician'],
  ['Warehouse Associate', 'Truck and Coach Technician'],
  ['Warehouse Associate', 'Welder'],
  ['Warehouse Associate', 'Machinist'],
  ['Warehouse Associate', 'Logistics Coordinator'],
  ['Warehouse Associate', 'Business Analyst'],
  ['Warehouse Associate', 'Network Administrator'],
  ['Sous Chef', 'Apprentice Electrician'],
  ['Sous Chef', 'Construction Electrician'],
  ['Sous Chef', 'Millwright'],
  ['Sous Chef', 'Cook'],
  ['Sous Chef', 'Restaurant Manager'],
  ['Sous Chef', 'Operations Manager'],
  ['Sous Chef', 'Registered Practical Nurse'],
  ['Sous Chef', 'Social Worker'],
  ['Sous Chef', 'Supply Chain Coordinator'],
  ['Sous Chef', 'Safety Coordinator'],
  ['Customer Service Representative', 'HR Coordinator'],
  ['Customer Service Representative', 'Account Manager'],
  ['Customer Service Representative', 'Insurance Broker'],
  ['Customer Service Representative', 'Recruiter'],
  ['Customer Service Representative', 'Marketing Coordinator'],
  ['Customer Service Representative', 'Software QA Analyst'],
  ['Customer Service Representative', 'DevOps Engineer'],
  ['Customer Service Representative', 'Financial Advisor'],
  ['Customer Service Representative', 'Paralegal'],
  ['Customer Service Representative', 'Law Clerk']
]

const TRADE_TOKENS = [
  'electrician',
  'millwright',
  'machinist',
  'cook',
  'plumber',
  'hvac',
  'carpenter',
  'welder',
  'pipefitter',
  'powerline',
  'heavy equipment technician',
  'truck and coach'
]

const HEALTHCARE_TOKENS = [
  'nurse',
  'lpn',
  'rpn',
  'dental hygienist',
  'pharmacy technician',
  'paramedic'
]

const PROFESSIONAL_LICENSED_TOKENS = [
  'accountant',
  'lawyer',
  'paralegal',
  'social worker',
  'financial advisor',
  'law clerk'
]

const TECH_TOKENS = [
  'software',
  'data scientist',
  'cybersecurity',
  'devops',
  'network',
  'ux',
  'qa analyst'
]

const TRADE_LEAKAGE_TERMS = [
  'apprenticeship',
  'red seal',
  'certificate of qualification',
  'journeyperson',
  'sponsor employer',
  'union lane',
  'skilled trades ontario'
]

const BAD_PHRASES = [
  'registered charity and not-for-profit organization',
  'applications applications',
  'orcompletion'
]

function classifyExpectedPath(targetRole) {
  const value = targetRole.toLowerCase()
  if (TRADE_TOKENS.some((token) => value.includes(token))) return 'TRADES'
  if (HEALTHCARE_TOKENS.some((token) => value.includes(token))) return 'HEALTHCARE_LICENSED'
  if (PROFESSIONAL_LICENSED_TOKENS.some((token) => value.includes(token))) return 'PROFESSIONAL_LICENSED'
  if (TECH_TOKENS.some((token) => value.includes(token))) return 'TECH'
  return 'GENERAL'
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function flattenReportText(payload) {
  const values = []
  const stack = [payload]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current == null) continue
    if (typeof current === 'string') {
      values.push(current)
      continue
    }
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }
    if (typeof current === 'object') {
      for (const value of Object.values(current)) stack.push(value)
    }
  }
  return normalizeText(values.join(' '))
}

function getIpFor(index) {
  const a = 10
  const b = 20 + Math.floor(index / 200)
  const c = 1 + Math.floor(index / 20) % 10
  const d = 1 + (index % 20)
  return `${a}.${b}.${c}.${d}`
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const json = await response.json().catch(() => null)
  return { response, json }
}

async function resolveOccupationId(query, index) {
  const ip = getIpFor(1000 + index)
  const params = new URLSearchParams({
    q: query,
    region: 'CA',
    limit: '3'
  })
  const { response, json } = await fetchJson(`${BASE_URL}/api/career-map/occupations?${params.toString()}`, {
    headers: {
      'x-forwarded-for': ip
    },
    cache: 'no-store'
  })
  if (!response.ok || !Array.isArray(json?.items) || json.items.length === 0) {
    return null
  }
  const first = json.items[0]
  if (!first || typeof first.occupationId !== 'string') return null
  return {
    occupationId: first.occupationId,
    title: typeof first.title === 'string' ? first.title : query
  }
}

function summarizeFaults(result) {
  return {
    status: result.status,
    roleSelectionRequired: result.status === 409,
    pathTypeMismatch: Boolean(result.pathTypeMismatch),
    tradeLeakage: Boolean(result.tradeLeakage),
    badPhraseHit: result.badPhraseHit ?? null,
    missingFieldCount: result.missingFieldCount ?? 0
  }
}

async function runCase(pair, index) {
  const [currentRole, targetRole] = pair
  const expectedPathType = classifyExpectedPath(targetRole)
  const currentResolved = await resolveOccupationId(currentRole, index * 2)
  const targetResolved = await resolveOccupationId(targetRole, index * 2 + 1)
  const ip = getIpFor(index)

  const payload = {
    currentRole,
    targetRole,
    currentRoleText: currentRole,
    targetRoleText: targetRole,
    currentRoleOccupationId: currentResolved?.occupationId ?? null,
    targetRoleOccupationId: targetResolved?.occupationId ?? null,
    recommendMode: false,
    notSureMode: false,
    skills: ['communication', 'teamwork', 'reliability'],
    experienceText: `${currentRole} background with measurable weekly performance and customer-facing experience.`,
    location: 'Ontario, Canada',
    locationText: 'Ontario, Canada',
    timeline: '1-3 months',
    timelineBucket: '1-3 months',
    workRegion: 'ON',
    education: "Bachelor's",
    educationLevel: "Bachelor's",
    useMarketEvidence: true
  }

  const { response, json } = await fetchJson(`${BASE_URL}/api/tools/career-switch-planner`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip
    },
    body: JSON.stringify(payload)
  })

  const result = {
    index: index + 1,
    currentRole,
    targetRole,
    expectedPathType,
    status: response.status,
    reportId: typeof json?.reportId === 'string' ? json.reportId : null,
    error: typeof json?.error === 'string' ? json.error : null,
    resolvedCurrentTitle: currentResolved?.title ?? null,
    resolvedTargetTitle: targetResolved?.title ?? null,
    actualPathType: json?.report?.transitionMode?.careerPathType ?? null,
    templateKey: json?.report?.transitionMode?.templateKey ?? null,
    missingFields: Array.isArray(json?.report?.v3Diagnostics?.missingFields)
      ? json.report.v3Diagnostics.missingFields
      : []
  }

  if (response.status !== 200) {
    return result
  }

  const text = flattenReportText(json?.report)
  const tradeLeakage =
    result.actualPathType !== 'TRADES' &&
    TRADE_LEAKAGE_TERMS.some((term) => text.includes(term))
  const badPhraseHit = BAD_PHRASES.find((term) => text.includes(term)) ?? null
  const pathTypeMismatch =
    typeof result.actualPathType === 'string' && result.actualPathType !== expectedPathType

  return {
    ...result,
    tradeLeakage,
    badPhraseHit,
    pathTypeMismatch,
    missingFieldCount: result.missingFields.length
  }
}

async function main() {
  const startedAt = new Date().toISOString()
  const results = []
  for (let index = 0; index < CASES.length; index += 1) {
    const pair = CASES[index]
    const caseResult = await runCase(pair, index)
    results.push(caseResult)
    const summary = summarizeFaults(caseResult)
    console.log(
      `${String(index + 1).padStart(2, '0')}/50 ${pair[0]} -> ${pair[1]} | status=${summary.status} | mismatch=${summary.pathTypeMismatch} | leak=${summary.tradeLeakage} | badPhrase=${summary.badPhraseHit ?? 'none'} | missing=${summary.missingFieldCount}`
    )
  }

  const non200 = results.filter((row) => row.status !== 200)
  const mismatch = results.filter((row) => row.pathTypeMismatch)
  const tradeLeak = results.filter((row) => row.tradeLeakage)
  const badPhrase = results.filter((row) => row.badPhraseHit)
  const highMissing = results.filter((row) => (row.missingFieldCount ?? 0) >= 8)

  const rankedFaults = [...results]
    .map((row) => ({
      ...row,
      severity:
        (row.status !== 200 ? 5 : 0) +
        (row.pathTypeMismatch ? 4 : 0) +
        (row.tradeLeakage ? 4 : 0) +
        (row.badPhraseHit ? 3 : 0) +
        Math.min(3, Math.floor((row.missingFieldCount ?? 0) / 4))
    }))
    .sort((a, b) => b.severity - a.severity)

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: results.length,
    ok: results.filter((row) => row.status === 200).length,
    non200: non200.length,
    roleSelectionRequired: non200.filter((row) => row.error === 'ROLE_SELECTION_REQUIRED').length,
    mismatchedPathType: mismatch.length,
    tradeLeakage: tradeLeak.length,
    badPhraseHits: badPhrase.length,
    highMissingFields: highMissing.length
  }

  const output = {
    summary,
    topFaults: rankedFaults.slice(0, 12),
    results
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')

  console.log('\n=== 50-case generation QA summary ===')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`Report written: ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('[qa-career-generation-50] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
