import './loadEnvLocal'
import process from 'node:process'

// Stability sweep for the non-planner AI tools (resume-analyzer, interview-prep,
// cover-letter). Hits the live generate endpoint with diverse inputs + edge
// cases and validates the output shape. Run against a dev/preview server:
//
//   npm run dev            # in one terminal
//   npm run qa:tools       # in another  (or QA_BASE_URL=https://… npm run qa:tools)
//
// Exits non-zero if any generation fails unexpectedly, so it can gate a deploy.

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

let ipCounter = 0
function nextIp() {
  ipCounter += 1
  return `10.99.${1 + (ipCounter % 8)}.${10 + ipCounter}`
}

type GenResponse = { status: number; json: Record<string, unknown> | null }

async function generate(body: Record<string, unknown>): Promise<GenResponse> {
  const res = await fetch(`${BASE}/api/tools/generate?plan=pro&uses=0`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
    body: JSON.stringify(body)
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  return { status: res.status, json }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}
function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

type Case = {
  label: string
  body: Record<string, unknown>
  expect: 'ok' | 'reject'
  validate?: (result: Record<string, unknown>) => string[]
}

function evaluate(c: Case, res: GenResponse): string[] {
  const json = res.json ?? {}
  if (c.expect === 'reject') {
    // A friendly validation rejection (4xx + error message) is the correct,
    // stable behaviour for too-thin/invalid input.
    if (res.status >= 400 && res.status < 500 && asString(json.error)) return []
    return [`expected a validation rejection, got status ${res.status}`]
  }
  const issues: string[] = []
  if (res.status !== 200) issues.push(`status ${res.status}`)
  else if (asString(json.error)) issues.push(`error: ${asString(json.error)}`)
  else if (!json.result) issues.push('no result')
  else {
    if (json.source !== 'ai') issues.push(`source=${String(json.source)} (template fallback)`)
    if (c.validate) issues.push(...c.validate(asRecord(json.result)))
  }
  return issues
}

const CASES: Case[] = [
  // ---- resume-analyzer ----
  {
    label: 'analyzer: sous chef -> Operations Manager',
    body: {
      tool: 'resume-analyzer',
      resumeText: 'Sous chef 6 yrs, led kitchen of 8, cut food cost 12%, managed inventory & ordering.',
      targetRole: 'Operations Manager'
    },
    expect: 'ok',
    validate: (r) => {
      const out: string[] = []
      if (typeof r.score !== 'number') out.push('no numeric score')
      if (asString(r.summary).length < 20) out.push('weak summary')
      if (asArray(asRecord(r.keywords).missing).length === 0) out.push('no keyword gaps')
      if (asArray(r.findings).length === 0) out.push('no findings')
      return out
    }
  },
  {
    label: 'analyzer: truck driver -> Electrician',
    body: {
      tool: 'resume-analyzer',
      resumeText: 'Drove delivery truck 3 yrs, perfect safety record, 50 stops/day, strong customer service.',
      targetRole: 'Electrician'
    },
    expect: 'ok',
    validate: (r) => (typeof r.score === 'number' ? [] : ['no numeric score'])
  },
  {
    label: 'analyzer: biology grad -> Data Analyst',
    body: {
      tool: 'resume-analyzer',
      resumeText: 'BSc Biology. Lab volunteer. Tutored statistics. Comfortable with Excel and R.',
      targetRole: 'Data Analyst'
    },
    expect: 'ok',
    validate: (r) => (asString(r.summary).length >= 20 ? [] : ['weak summary'])
  },
  {
    label: 'analyzer: thin input is rejected (edge)',
    body: { tool: 'resume-analyzer', resumeText: 'Short.', targetRole: 'Nurse' },
    expect: 'reject'
  },
  // ---- interview-prep ----
  ...['Electrician Apprentice', 'Registered Nurse', 'Junior Software Developer', 'Welder', 'Bookkeeper', 'Barista'].map(
    (role): Case => ({
      label: `interview: ${role}`,
      body: { tool: 'interview-prep', role },
      expect: 'ok',
      validate: (r) => {
        const questions = asArray(r.questions)
        if (questions.length < 3) return ['fewer than 3 questions']
        const thin = questions.some((q) => {
          const rec = asRecord(q)
          return !asString(rec.q) || asString(rec.a).length < 30
        })
        return thin ? ['empty/thin question or answer'] : []
      }
    })
  ),
  {
    label: 'interview: empty role is rejected (edge)',
    body: { tool: 'interview-prep', role: '' },
    expect: 'reject'
  },
  // ---- cover-letter ----
  {
    label: 'cover: Welder @ NorthSteel',
    body: {
      tool: 'cover-letter',
      role: 'Welder',
      company: 'NorthSteel',
      jobPosting: 'Seeking a CWB-certified welder for structural steel fabrication, MIG/TIG, blueprint reading.',
      background: '4 yrs warehouse, forklift certified, some hobby welding.'
    },
    expect: 'ok',
    validate: validateCover
  },
  {
    label: 'cover: Data Analyst @ Insight Co',
    body: {
      tool: 'cover-letter',
      role: 'Data Analyst',
      company: 'Insight Co',
      jobPosting: 'Looking for a data analyst skilled in SQL, dashboards, and stakeholder reporting.',
      background: 'Retail supervisor, strong with spreadsheets, self-taught SQL.'
    },
    expect: 'ok',
    validate: validateCover
  },
  {
    label: 'cover: Pharmacy Tech with no background (edge)',
    body: {
      tool: 'cover-letter',
      role: 'Pharmacy Technician',
      company: 'CareRx',
      jobPosting: 'Registered pharmacy technician to support dispensing and inventory.',
      background: ''
    },
    expect: 'ok',
    validate: validateCover
  },
  {
    label: 'cover: missing job posting is rejected (edge)',
    body: { tool: 'cover-letter', role: 'Barista', company: 'Bean', jobPosting: '' },
    expect: 'reject'
  }
]

function validateCover(r: Record<string, unknown>): string[] {
  const out: string[] = []
  if (asString(r.opening).length < 30) out.push('weak opening')
  if (asString(r.body).length < 60) out.push('weak body')
  if (!asString(r.closing)) out.push('no closing')
  const blob = `${asString(r.opening)} ${asString(r.body)} ${asString(r.closing)}`.toLowerCase()
  if (/\[[^\]]*\]|lorem|placeholder|undefined|\bnull\b/.test(blob)) out.push('placeholder/garbage token')
  return out
}

async function main() {
  let pass = 0
  for (const c of CASES) {
    const res = await generate(c.body)
    const issues = evaluate(c, res)
    if (issues.length === 0) pass += 1
    console.log(`${issues.length ? '✗' : '✓'} ${c.label}${issues.length ? ' :: ' + issues.join('; ') : ''}`)
  }
  const failed = CASES.length - pass
  console.log(`\n=== TOOL SWEEP: ${pass}/${CASES.length} clean ===`)
  process.exit(failed === 0 ? 0 : 1)
}

void main()
