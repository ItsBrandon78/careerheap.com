import { PLANNER_EXAMPLE_SCENARIOS } from '@/lib/planner/exampleScenarios'
import { normalizeBulletKey } from '@/lib/transition/dedupe'

export type SuggestedCareerInput = {
  occupationId?: string
  title: string
  score?: number
  difficulty?: string
  transitionTime?: string
  regulated?: boolean
  topReasons?: string[]
  salary?: {
    native?: {
      median?: number | null
    } | null
    usd?: {
      median?: number | null
    } | null
  }
}

export type RecommendedTargetCard = {
  title: string
  why: string[]
  difficulty: string
  transitionTime: string
}

export type RecommendedTargetSection = {
  title: string
  description: string
  roles: RecommendedTargetCard[]
}

type BuildRecommendedTargetSectionsInput = {
  careers: SuggestedCareerInput[]
  currentRoleInput: string
  currentRoleCode?: string | null
  targetRoleInput?: string | null
  targetRoleCode?: string | null
  currentAlternatives?: Array<{ title: string; code?: string | null }>
}

function medianHourlyComp(career: SuggestedCareerInput) {
  return Number(career.salary?.native?.median ?? career.salary?.usd?.median ?? 0)
}

function parseTransitionMonths(value: string) {
  const matches = [...value.matchAll(/(\d+)/g)].map((match) => Number.parseInt(match[1], 10))
  if (matches.length === 0) return 99
  return Math.max(1, Math.min(...matches))
}

function titleKey(value: string) {
  return normalizeBulletKey(value)
}

function singularTitleKey(value: string) {
  const key = titleKey(value)
  return key.replace(/\b([a-z]{4,})s\b/g, '$1')
}

function isSameRoleTitle(candidate: string, ...comparisons: Array<string | null | undefined>) {
  const key = titleKey(candidate)
  const singularKey = singularTitleKey(candidate)
  if (!key) return false
  return comparisons.some((item) => {
    const comparisonKey = titleKey(item ?? '')
    const comparisonSingularKey = singularTitleKey(item ?? '')
    return (
      key === comparisonKey ||
      singularKey === comparisonSingularKey ||
      key.includes(comparisonSingularKey) ||
      comparisonKey.includes(singularKey)
    )
  })
}

function dedupeCards(cards: RecommendedTargetCard[]) {
  const seen = new Set<string>()
  return cards.filter((card) => {
    const key = singularTitleKey(card.title)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeWhy(values: string[], fallback: string) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of [...values, fallback]) {
    const cleaned = value.trim()
    const key = titleKey(cleaned)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
    if (output.length >= 2) break
  }
  return output.length > 0 ? output : [fallback]
}

function fallbackCardsFromExamples(
  input: BuildRecommendedTargetSectionsInput,
  usedKeys: Set<string>
) {
  const currentKey = singularTitleKey(input.currentRoleInput)
  const targetKey = singularTitleKey(input.targetRoleInput ?? '')

  const relevantExamples = PLANNER_EXAMPLE_SCENARIOS.filter((scenario) => {
    if (titleKey(scenario.currentRole) === currentKey) return true
    if (titleKey(scenario.currentRole).includes(currentKey) || currentKey.includes(titleKey(scenario.currentRole))) {
      return true
    }
    return false
  })

  const pool = (relevantExamples.length > 0 ? relevantExamples : PLANNER_EXAMPLE_SCENARIOS)
    .map((scenario) => ({
      title: scenario.targetRole,
      why: [
        scenario.summary,
        `A nearby target people with ${input.currentRoleInput || 'your'} background can understand quickly.`
      ],
      difficulty: scenario.timelineBucket === '1-3 months' ? 'easy' : scenario.timelineBucket === '3-6 months' ? 'moderate' : 'hard',
      transitionTime: scenario.timelineBucket.replace('+', '')
    }))
    .filter((card) => !isSameRoleTitle(card.title, input.currentRoleInput, input.targetRoleInput))
    .filter((card) => {
      const key = singularTitleKey(card.title)
      if (!key || key === currentKey || key === targetKey || usedKeys.has(key)) return false
      usedKeys.add(key)
      return true
    })

  for (const alternative of input.currentAlternatives ?? []) {
    const key = singularTitleKey(alternative.title)
    if (!key || key === currentKey || key === targetKey || usedKeys.has(key)) continue
    usedKeys.add(key)
    pool.unshift({
      title: alternative.title,
      why: [
        `A close occupational neighbor to ${input.currentRoleInput || 'your current role'}.`,
        'Useful when you want a smaller jump or a faster first move.'
      ],
      difficulty: 'moderate',
      transitionTime: '1-3 months'
    })
  }

  return dedupeCards(pool).slice(0, 8)
}

function toCard(career: SuggestedCareerInput, currentRoleInput: string) {
  return {
    title: career.title,
    why: normalizeWhy(
      career.topReasons?.slice(0, 2) ?? [],
      `Uses more of your ${currentRoleInput || 'current'} overlap than a cold jump.`
    ),
    difficulty: career.difficulty || 'moderate',
    transitionTime: career.transitionTime || '2-6 months'
  } satisfies RecommendedTargetCard
}

export function buildRecommendedTargetSections(input: BuildRecommendedTargetSectionsInput) {
  const currentCode = input.currentRoleCode ?? null
  const targetCode = input.targetRoleCode ?? null
  const excludedTitles = [input.currentRoleInput, input.targetRoleInput ?? '']
  const usedKeys = new Set<string>()

  const filteredCareers = input.careers
    .filter((career) => {
      if (!career.title.trim()) return false
      if (career.occupationId && (career.occupationId === currentCode || career.occupationId === targetCode)) {
        return false
      }
      if (isSameRoleTitle(career.title, ...excludedTitles)) return false
      return true
    })
    .filter((career, index, collection) => {
      const key = singularTitleKey(career.title)
      return collection.findIndex((item) => singularTitleKey(item.title) === key) === index
    })

  const closest = filteredCareers
    .slice()
    .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
    .slice(0, 3)
    .map((career) => {
      usedKeys.add(singularTitleKey(career.title))
      return toCard(career, input.currentRoleInput)
    })

  const higherUpside = filteredCareers
    .slice()
    .sort((left, right) => medianHourlyComp(right) - medianHourlyComp(left))
    .filter((career) => !usedKeys.has(singularTitleKey(career.title)))
    .slice(0, 3)
    .map((career) => {
      usedKeys.add(singularTitleKey(career.title))
      return toCard(career, input.currentRoleInput)
    })

  const bridge = filteredCareers
    .slice()
    .sort((left, right) => parseTransitionMonths(left.transitionTime ?? '') - parseTransitionMonths(right.transitionTime ?? ''))
    .filter((career) => !usedKeys.has(singularTitleKey(career.title)))
    .slice(0, 3)
    .map((career) => {
      usedKeys.add(singularTitleKey(career.title))
      return toCard(career, input.currentRoleInput)
    })

  const fallback = fallbackCardsFromExamples(input, usedKeys)

  const fillSection = (roles: RecommendedTargetCard[], count: number) => {
    const output = [...roles]
    while (output.length < count && fallback.length > 0) {
      const candidate = fallback.shift()
      if (!candidate) break
      output.push(candidate)
    }
    return dedupeCards(output)
  }

  const sectionMap = [
    {
      title: 'Closest matches',
      description: 'Strongest fit based on your current background.',
      roles: fillSection(closest, 3)
    },
    {
      title: 'Higher upside',
      description: 'Roles with stronger earnings potential if you can absorb a wider jump.',
      roles: fillSection(higherUpside, 3)
    },
    {
      title: 'Adjacent bridge roles',
      description: 'Faster-entry roles that can shorten the path into a bigger move.',
      roles: fillSection(bridge, 3)
    }
  ]

  return sectionMap.filter((section) => section.roles.length > 0)
}
