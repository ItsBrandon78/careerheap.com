import process from 'node:process'
import {
  PLANNER_EXAMPLE_SCENARIOS,
  type PlannerExampleScenario
} from '../lib/planner/exampleScenarios'
import { derivePlannerJobRecommendationView } from '../lib/planner/jobRecommendations'
import {
  OCCUPATION_RESOLUTION_THRESHOLD,
  resolveOccupation,
  type OccupationResolutionSeed
} from '../lib/occupations/resolveOccupation'
import { generateTransitionPlan } from '../lib/transition/generatePlan'
import {
  dedupeBullets,
  excludeExistingBullets,
  normalizeBulletKey
} from '../lib/transition/dedupe'
import { TransitionModeSchema, type PlannerReportSource } from '../lib/transition/types'

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function canonicalizeRoleTitle(value: string) {
  const stripped = value
    .replace(/\b(apprentice|helper|intern|junior|jr|senior|sr)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!stripped) return value.trim()
  return stripped
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function regionFromScenario(example: PlannerExampleScenario) {
  return example.workRegion === 'ca' || example.workRegion === 'remote-ca' ? 'CA' : 'US'
}

function buildSeedIndex(examples: PlannerExampleScenario[]) {
  const rows = new Map<string, OccupationResolutionSeed>()

  for (const example of examples) {
    for (const rawTitle of [example.currentRole, example.targetRole]) {
      const canonicalTitle = canonicalizeRoleTitle(rawTitle)
      const region = regionFromScenario(example)
      const key = `${region}:${canonicalTitle.toLowerCase()}`
      const existing = rows.get(key)
      const aliases = Array.isArray(existing?.codes?.aliases)
        ? existing?.codes?.aliases.filter((item): item is string => typeof item === 'string')
        : []
      if (!aliases.includes(rawTitle)) aliases.push(rawTitle)

      rows.set(key, {
        id: `${region.toLowerCase()}-${slugify(canonicalTitle)}`,
        title: canonicalTitle,
        region,
        source: region === 'CA' ? 'noc' : 'onet',
        codes: {
          code: `${region.toLowerCase()}-${slugify(canonicalTitle)}`,
          aliases
        }
      })
    }
  }

  return [...rows.values()]
}

function inferRoleFamily(targetRole: string) {
  const normalized = normalizeText(targetRole)
  if (/\belectrician\b|\bhvac\b|\bplumber\b/.test(normalized)) return 'trade'
  if (/\bnurse\b|\bcna\b|\bpsw\b/.test(normalized)) return 'profession'
  if (/\bdata scientist\b/.test(normalized)) return 'credentialed'
  if (/\bdesigner\b|\bdeveloper\b|\bsocial media\b/.test(normalized)) return 'portfolio'
  if (/\bcoordinator\b|\baccount manager\b|\boperations\b|\bbookkeeping\b/.test(normalized)) {
    return 'ladder'
  }
  return 'general'
}

function buildReport(example: PlannerExampleScenario, targetTitle: string): PlannerReportSource {
  const family = inferRoleFamily(example.targetRole)
  const regulated = family === 'trade' || family === 'profession'
  const tradeSignals = family === 'trade'
  const professionSignals = family === 'profession'
  const portfolioSignals = family === 'portfolio'
  const credentialSignals = family === 'credentialed'

  return {
    compatibilitySnapshot: {
      score: family === 'trade' || family === 'profession' ? 61 : 69,
      topReasons: ['Your background has enough overlap to start a focused transition plan.']
    },
    suggestedCareers: [
      {
        occupationId: slugify(targetTitle),
        title: targetTitle,
        score: family === 'trade' ? 76 : family === 'profession' ? 68 : 81,
        transitionTime:
          family === 'trade'
            ? '3-6 months'
            : family === 'profession'
              ? '6-12 months'
              : family === 'credentialed'
                ? '3-6 months'
                : family === 'portfolio'
                  ? '2-6 months'
                  : '1-3 months',
        regulated,
        topReasons: [
          `This path makes practical use of your ${example.currentRole.toLowerCase()} experience.`,
          family === 'trade'
            ? 'The entry route is structured and predictable if you respect the sequence.'
            : 'The entry route is realistic if you keep weekly output measured.'
        ],
        salary: {
          native: {
            currency: regionFromScenario(example) === 'CA' ? 'CAD' : 'USD',
            low: tradeSignals ? 22 : 24,
            median: professionSignals ? 36 : tradeSignals ? 32 : 34,
            high: professionSignals ? 48 : tradeSignals ? 44 : 52,
            sourceName: 'QA Fixture',
            asOfDate: '2026-03-02',
            region: example.locationText
          },
          usd: null,
          conversion: null
        }
      }
    ],
    targetRequirements: {
      education:
        professionSignals
          ? "Associate's"
          : credentialSignals
            ? "Bachelor's"
            : portfolioSignals
              ? 'Self-taught / portfolio-based'
              : 'High school',
      certifications:
        tradeSignals
          ? ['Entry safety training']
          : credentialSignals
            ? ['Recognized credential']
            : professionSignals
              ? ['Licensure exam']
              : [],
      hardGates:
        tradeSignals
          ? ['Employer sponsor or apprenticeship intake']
          : professionSignals
            ? ['Licensing board requirements']
            : [],
      employerSignals:
        tradeSignals
          ? ['Safety', 'Tool familiarity', 'Measurement']
          : portfolioSignals
            ? ['Portfolio', 'Case study']
            : credentialSignals
              ? ['Applied proof', 'Hands-on practice']
              : ['Communication', 'Process discipline'],
      apprenticeshipHours: tradeSignals ? 4000 : null,
      examRequired: professionSignals ? true : tradeSignals ? false : null,
      regulated,
      sources: []
    },
    transitionSections: {
      mandatoryGateRequirements:
        tradeSignals || professionSignals
          ? [{ label: tradeSignals ? 'Entry registration' : 'Licensing sequence', gapLevel: 'missing', howToGet: 'QA' }]
          : [],
      coreHardSkills: [
        {
          label:
            tradeSignals
              ? 'Safety and tool basics'
              : portfolioSignals
                ? 'Portfolio-ready work'
                : credentialSignals
                  ? 'Hands-on practice'
                  : 'Role-specific process fit',
          gapLevel: 'missing',
          howToLearn: 'QA'
        }
      ],
      toolsPlatforms: tradeSignals
        ? [{ label: 'Core tools', gapLevel: 'missing', quickProject: 'QA' }]
        : credentialSignals
          ? [{ label: 'Core platform', gapLevel: 'missing', quickProject: 'QA' }]
          : [],
      experienceSignals: [
        {
          label:
            family === 'ladder'
              ? 'Visible ownership'
              : family === 'portfolio'
                ? 'Work samples'
                : 'Target-role proof',
          gapLevel: 'missing',
          howToBuild: 'QA'
        }
      ],
      transferableStrengths: example.skills.slice(0, 2).map((skill) => ({
        label: skill,
        requirement: 'QA',
        source: 'skills' as const
      }))
    },
    executionStrategy: {
      whereYouStandNow: {
        strengths: example.skills.slice(0, 2).map((summary) => ({ summary })),
        missingMandatoryRequirements: [],
        competitiveDisadvantages: []
      },
      realBlockers: {
        requiredToApply: [],
        requiredToCompete: []
      }
    },
    transitionReport: {
      marketSnapshot: {
        role: targetTitle,
        location: example.locationText
      },
      transferableStrengths: example.skills.slice(0, 2).map((strength) => ({ strength }))
    },
    linksResources: [],
    marketEvidence: {
      baselineOnly: false,
      postingsCount: 12,
      query: { location: example.locationText }
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertUniqueList(label: string, values: string[]) {
  const seen = new Set<string>()
  for (const value of values) {
    const key = normalizeBulletKey(value)
    if (!key) continue
    if (seen.has(key)) {
      throw new Error(`${label} contains a duplicate bullet: ${value}`)
    }
    seen.add(key)
  }
}

function assertNoUndefinedStrings(value: unknown, label: string) {
  if (typeof value === 'string') {
    if (value.toLowerCase().includes('undefined')) {
      throw new Error(`${label} contains "undefined": ${value}`)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefinedStrings(item, `${label}[${index}]`))
    return
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      assertNoUndefinedStrings(nested, `${label}.${key}`)
    }
  }
}

async function runScenario(example: PlannerExampleScenario, index: OccupationResolutionSeed[]) {
  const currentResolution = await resolveOccupation(example.currentRole, example.locationText, {
    region: regionFromScenario(example),
    providedIndex: index
  })
  const targetResolution = await resolveOccupation(example.targetRole, example.locationText, {
    region: regionFromScenario(example),
    providedIndex: index
  })

  const currentNeedsDisambiguation =
    currentResolution.confidence < OCCUPATION_RESOLUTION_THRESHOLD &&
    currentResolution.alternatives.length > 0
  const targetNeedsDisambiguation =
    targetResolution.confidence < OCCUPATION_RESOLUTION_THRESHOLD &&
    targetResolution.alternatives.length > 0

  assert(
    currentResolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD || currentNeedsDisambiguation,
    `${example.id}: current role confidence is too low without valid alternatives.`
  )
  assert(
    targetResolution.confidence >= OCCUPATION_RESOLUTION_THRESHOLD || targetNeedsDisambiguation,
    `${example.id}: target role confidence is too low without valid alternatives.`
  )

  if (normalizeText(example.currentRole) !== normalizeText(example.targetRole)) {
    assert(
      !(
        normalizeText(currentResolution.title) === normalizeText(targetResolution.title) &&
        normalizeText(currentResolution.stage ?? '') === normalizeText(targetResolution.stage ?? '')
      ),
      `${example.id}: role resolution drift collapsed current and target into the same role.`
    )
  }

  const report = buildReport(example, targetResolution.title || example.targetRole)
  const plan = generateTransitionPlan({
    currentRole: example.currentRole,
    targetRole: example.targetRole,
    experienceText: example.experienceText,
    location: example.locationText,
    education: example.educationLevel,
    incomeTarget: example.incomeTarget,
    report,
    currentResolution: currentResolution.occupationId
      ? {
          title: currentResolution.title,
          code: currentResolution.code,
          source: currentResolution.source,
          confidence: currentResolution.confidence,
          stage: currentResolution.stage ?? null,
          specialization: currentResolution.specialization ?? null,
          rawInputTitle: currentResolution.rawInputTitle,
          region: currentResolution.region ?? null
        }
      : null,
    targetResolution: targetResolution.occupationId
      ? {
          title: targetResolution.title,
          code: targetResolution.code,
          source: targetResolution.source,
          confidence: targetResolution.confidence,
          stage: targetResolution.stage ?? null,
          specialization: targetResolution.specialization ?? null,
          rawInputTitle: targetResolution.rawInputTitle,
          region: targetResolution.region ?? null
        }
      : null
  })

  const parsed = TransitionModeSchema.safeParse(plan)
  assert(parsed.success, `${example.id}: schema validation failed.`)

  assertUniqueList(`${example.id} strengths`, plan.gaps.strengths)
  assertUniqueList(`${example.id} missing`, plan.gaps.missing)
  assertUniqueList(`${example.id} barriers`, plan.reality.barriers)
  assertUniqueList(`${example.id} mitigations`, plan.reality.mitigations)

  const quickWins = dedupeBullets(plan.gaps.strengths, 4)
  const followOnStrengths = excludeExistingBullets(plan.gaps.strengths, quickWins, 4)
  const overlap = quickWins.filter((item) =>
    followOnStrengths.some((candidate) => normalizeBulletKey(candidate) === normalizeBulletKey(item))
  )
  assert(overlap.length === 0, `${example.id}: duplicate quick wins/strengths survived UI dedupe.`)

  for (const phase of plan.plan90) {
    assertUniqueList(`${example.id} ${phase.phase} weekly targets`, phase.weeklyTargets)
    for (const target of phase.weeklyTargets) {
      assert(!/cycle\/week/i.test(target), `${example.id}: unreadable weekly target "${target}"`)
    }
  }

  assert(
    plan.resources.local.length + plan.resources.online.length + plan.resources.internal.length > 0,
    `${example.id}: resources are empty.`
  )

  assertNoUndefinedStrings(plan, example.id)

  console.log(
    `PASS ${example.id} | current=${currentResolution.title} (${currentResolution.confidence.toFixed(2)}) | target=${targetResolution.title} (${targetResolution.confidence.toFixed(2)}) | difficulty=${plan.difficulty.score.toFixed(1)}`
  )
}

async function main() {
  const scenarios = PLANNER_EXAMPLE_SCENARIOS.slice(0, 10)
  const index = buildSeedIndex(scenarios)

  for (const scenario of scenarios) {
    await runScenario(scenario, index)
  }

  const loadingView = derivePlannerJobRecommendationView({
    status: 'loading',
    jobs: [],
    targetRole: 'HVAC Technician',
    location: 'Cleveland, Ohio, United States'
  })
  const emptyView = derivePlannerJobRecommendationView({
    status: 'success',
    jobs: [],
    targetRole: 'HVAC Technician',
    location: 'Cleveland, Ohio, United States',
    baselineOnly: true
  })
  const errorView = derivePlannerJobRecommendationView({
    status: 'error',
    jobs: [],
    targetRole: 'HVAC Technician',
    location: 'Cleveland, Ohio, United States',
    message: 'Provider unavailable.'
  })
  const successView = derivePlannerJobRecommendationView({
    status: 'success',
    jobs: [
      {
        id: 'adzuna:1',
        title: 'HVAC Installer',
        company: 'Northside Mechanical',
        location: 'Cleveland, Ohio, United States',
        description: 'Need safe material handling, troubleshooting, and customer communication.',
        sourceUrl: 'https://example.test/jobs/1'
      }
    ],
    targetRole: 'HVAC Technician',
    location: 'Cleveland, Ohio, United States',
    signals: ['Troubleshooting']
  })

  assert(loadingView.status === 'loading', 'Job recommendation loading state failed.')
  assert(emptyView.status === 'empty', 'Job recommendation empty state failed.')
  assert(errorView.status === 'error', 'Job recommendation error state failed.')
  assert(successView.status === 'success' && successView.items.length === 1, 'Job recommendation success state failed.')

  console.log(`QA PASS: ${scenarios.length} scenarios validated with no schema or quality regressions.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
