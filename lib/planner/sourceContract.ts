import type {
  DashboardFallbackValue,
  PlannerDashboardV3Model,
  SourceType
} from '@/lib/planner/v3Dashboard'

export type SourceContractIssue = {
  path: string
  message: string
}

const VALID_SOURCE_TYPES: SourceType[] = ['verified', 'derived', 'estimate']

function isLikelyEstimateLabel(value: string) {
  return /\bestimate\b|\bneeds data\b|\bunknown\b/i.test(value)
}

function validateFallbackValue(
  value: DashboardFallbackValue<string> | undefined,
  path: string,
  issues: SourceContractIssue[]
) {
  if (!value || typeof value !== 'object') {
    issues.push({ path, message: 'Missing fallback value object.' })
    return
  }

  const sourceType = value.sourceType
  const sourceLabel = typeof value.sourceLabel === 'string' ? value.sourceLabel.trim() : ''

  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    issues.push({ path, message: `Invalid sourceType "${String(sourceType)}".` })
    return
  }

  if (!sourceLabel) {
    issues.push({ path, message: 'Missing sourceLabel.' })
    return
  }

  if (sourceType === 'verified' && isLikelyEstimateLabel(sourceLabel)) {
    issues.push({
      path,
      message: `Verified value cannot use estimate-like sourceLabel "${sourceLabel}".`
    })
  }

  if (value.badge === 'Needs data' && sourceType === 'verified') {
    issues.push({
      path,
      message: 'Needs data badge cannot be paired with verified sourceType.'
    })
  }
}

export function validatePlannerDashboardSourceContract(model: PlannerDashboardV3Model) {
  const issues: SourceContractIssue[] = []

  validateFallbackValue(model.hero.difficulty, 'hero.difficulty', issues)
  validateFallbackValue(model.hero.timeline, 'hero.timeline', issues)
  validateFallbackValue(model.hero.probability, 'hero.probability', issues)
  validateFallbackValue(model.hero.trainingCost, 'hero.trainingCost', issues)
  validateFallbackValue(model.hero.salaryPotential, 'hero.salaryPotential', issues)

  validateFallbackValue(model.marketSnapshot.entryWage, 'market.entryWage', issues)
  validateFallbackValue(model.marketSnapshot.midCareerSalary, 'market.midCareerSalary', issues)
  validateFallbackValue(model.marketSnapshot.topEarners, 'market.topEarners', issues)
  validateFallbackValue(model.marketSnapshot.localDemand, 'market.localDemand', issues)
  validateFallbackValue(model.marketSnapshot.hiringRequirements, 'market.hiringRequirements', issues)

  validateFallbackValue(model.realityCheck.applicationsNeeded, 'reality.applicationsNeeded', issues)
  validateFallbackValue(model.realityCheck.timeToOffer, 'reality.timeToOffer', issues)
  validateFallbackValue(model.realityCheck.competitionLevel, 'reality.competitionLevel', issues)
  validateFallbackValue(model.realityCheck.financialTradeoff, 'reality.financialTradeoff', issues)

  model.training.costStack.forEach((item, index) => {
    validateFallbackValue(item, `training.costStack[${index}]`, issues)
  })

  model.training.courses.forEach((course, index) => {
    const path = `training.courses[${index}]`
    if (!VALID_SOURCE_TYPES.includes(course.sourceType)) {
      issues.push({ path, message: `Invalid sourceType "${String(course.sourceType)}".` })
    }
    if (!course.sourceLabel || !course.sourceLabel.trim()) {
      issues.push({ path, message: 'Missing sourceLabel.' })
    }
    if (course.sourceType === 'verified' && isLikelyEstimateLabel(course.sourceLabel)) {
      issues.push({
        path,
        message: `Verified course cannot use estimate-like sourceLabel "${course.sourceLabel}".`
      })
    }
  })

  model.alternatives.cards.forEach((card, index) => {
    validateFallbackValue(card.salary, `alternatives.cards[${index}].salary`, issues)
  })

  return {
    valid: issues.length === 0,
    issues
  }
}

