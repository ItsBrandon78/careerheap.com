import './loadEnvLocal'
import process from 'node:process'
import { POST } from '../app/api/tools/career-switch-planner/route'

type PlannerPayload = {
  currentRoleText: string
  targetRoleText: string
  skills: string[]
  experienceText: string
  educationLevel: string
  workRegion: string
  locationText: string
  timelineBucket: string
  useMarketEvidence: boolean
  currentRoleOccupationId?: string
  targetRoleOccupationId?: string
}

type Scenario = {
  id: string
  label: string
  expectCuratedProfile: boolean
  payload: PlannerPayload
}

type RouteJson = Record<string, unknown>

function makeRequest(body: PlannerPayload) {
  return new Request('http://localhost:3000/api/tools/career-switch-planner', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000'
    },
    body: JSON.stringify(body)
  })
}

async function invokePlanner(body: PlannerPayload) {
  const response = await POST(makeRequest(body))
  const json = (await response.json()) as RouteJson
  return { status: response.status, json }
}

async function runWithRoleResolution(basePayload: PlannerPayload) {
  const payload: PlannerPayload = { ...basePayload }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await invokePlanner(payload)
    if (result.status !== 409) return result

    if (result.json?.error !== 'ROLE_SELECTION_REQUIRED' || !result.json?.role) {
      return result
    }

    const alternatives = Array.isArray(result.json.alternatives)
      ? (result.json.alternatives as Array<Record<string, unknown>>)
      : []
    const selected = alternatives[0]
    const occupationId =
      selected && typeof selected.occupationId === 'string' ? selected.occupationId : null
    if (!occupationId) return result

    if (result.json.role === 'current') {
      payload.currentRoleOccupationId = occupationId
    } else if (result.json.role === 'target') {
      payload.targetRoleOccupationId = occupationId
    } else {
      return result
    }
  }

  throw new Error('Exceeded role-resolution retries while invoking planner route.')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function summarizeSourceState(report: RouteJson) {
  const reportRecord = report as Record<string, unknown>
  const pathwayProfile =
    reportRecord.careerPathwayProfile && typeof reportRecord.careerPathwayProfile === 'object'
      ? (reportRecord.careerPathwayProfile as Record<string, unknown>)
      : null
  const meta =
    pathwayProfile?.meta && typeof pathwayProfile.meta === 'object'
      ? (pathwayProfile.meta as Record<string, unknown>)
      : null
  const sourceEnrichment =
    reportRecord.sourceEnrichment && typeof reportRecord.sourceEnrichment === 'object'
      ? (reportRecord.sourceEnrichment as Record<string, unknown>)
      : null
  const sourcePath =
    sourceEnrichment?.sourcePath && typeof sourceEnrichment.sourcePath === 'object'
      ? (sourceEnrichment.sourcePath as Record<string, unknown>)
      : null
  const cache =
    sourceEnrichment?.cache && typeof sourceEnrichment.cache === 'object'
      ? (sourceEnrichment.cache as Record<string, unknown>)
      : null
  const suggestedCareers = Array.isArray(reportRecord.suggestedCareers)
    ? (reportRecord.suggestedCareers as Array<Record<string, unknown>>)
    : []
  const firstCareer = suggestedCareers[0]
  const salary =
    firstCareer?.salary && typeof firstCareer.salary === 'object'
      ? (firstCareer.salary as Record<string, unknown>)
      : null
  const native =
    salary?.native && typeof salary.native === 'object'
      ? (salary.native as Record<string, unknown>)
      : null

  return {
    profileSlug: typeof meta?.slug === 'string' ? meta.slug : null,
    trainingSourcePath: typeof sourcePath?.training === 'string' ? sourcePath.training : 'missing',
    wageSourcePath: typeof sourcePath?.wage === 'string' ? sourcePath.wage : 'missing',
    cacheHit: Boolean(cache?.hit),
    cacheExpiresAt: typeof cache?.expiresAt === 'string' ? cache.expiresAt : null,
    trainingCards: Array.isArray(sourceEnrichment?.trainingCards)
      ? sourceEnrichment.trainingCards.length
      : 0,
    hasNativeWage: Boolean(
      native?.low ?? native?.median ?? native?.high
    )
  }
}

async function runScenario(scenario: Scenario) {
  const first = await runWithRoleResolution(scenario.payload)
  assert(first.status === 200, `${scenario.id}: expected 200, got ${first.status}`)
  assert(first.json?.report, `${scenario.id}: route returned no report payload`)

  const firstReport = first.json.report as RouteJson
  const firstSummary = summarizeSourceState(firstReport)

  if (scenario.expectCuratedProfile) {
    assert(
      firstSummary.trainingSourcePath === 'curated_profile',
      `${scenario.id}: expected training source path curated_profile, got ${firstSummary.trainingSourcePath}`
    )
  } else {
    assert(
      firstSummary.trainingSourcePath !== 'curated_profile',
      `${scenario.id}: expected non-curated training path, got curated_profile`
    )
    assert(
      firstSummary.trainingSourcePath === 'web_search' || firstSummary.trainingSourcePath === 'none',
      `${scenario.id}: expected non-curated training path web_search/none, got ${firstSummary.trainingSourcePath}`
    )
  }

  const second = await runWithRoleResolution(scenario.payload)
  assert(second.status === 200, `${scenario.id}: second run expected 200, got ${second.status}`)
  const secondReport = second.json.report as RouteJson
  const secondSummary = summarizeSourceState(secondReport)
  assert(secondSummary.cacheHit, `${scenario.id}: expected enrichment cache hit on second run`)

  return {
    scenario: scenario.label,
    firstSummary,
    secondSummary
  }
}

const scenarios: Scenario[] = [
  {
    id: 'curated-plumber-on',
    label: 'Curated profile role: Plumber in Ontario',
    expectCuratedProfile: true,
    payload: {
      currentRoleText: 'Sous Chef',
      targetRoleText: 'Plumber',
      skills: ['Tool familiarity', 'Team coordination', 'Safety routines'],
      experienceText:
        'Hands-on shift lead used to physical work, regulated routines, and coordinating busy team operations.',
      educationLevel: 'High school',
      workRegion: 'ON',
      locationText: 'Ontario, Canada',
      timelineBucket: '6-12 months',
      useMarketEvidence: true
    }
  },
  {
    id: 'non-curated-chiropractor-on',
    label: 'Non-curated role: Chiropractor in Ontario',
    expectCuratedProfile: false,
    payload: {
      currentRoleText: 'Sous Chef',
      targetRoleText: 'Chiropractor',
      skills: ['Customer service', 'Reliability', 'Documentation'],
      experienceText:
        'Career switcher seeking a licensed health profession path and comparing long-run schooling requirements in Ontario.',
      educationLevel: "Bachelor's",
      workRegion: 'ON',
      locationText: 'Ontario, Canada',
      timelineBucket: '12+ months',
      useMarketEvidence: true
    }
  }
]

async function main() {
  const results = []

  for (const scenario of scenarios) {
    const result = await runScenario(scenario)
    results.push(result)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        ranAt: new Date().toISOString(),
        results
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[qa:planner-source-enrichment] failed')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
