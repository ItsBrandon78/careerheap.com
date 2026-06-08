'use client'

import Badge from '@/components/Badge'
import Card from '@/components/Card'
import type { DashboardFallbackValue, PlannerDashboardV3Model } from '@/lib/planner/v3Dashboard'

interface PlannerCommandCenterProps {
  hero: PlannerDashboardV3Model['hero']
  decision: PlannerDashboardV3Model['decision']
  pathwayWeighting: PlannerDashboardV3Model['pathwayWeighting']
  heroCardChecked: boolean
  onToggleHeroCard: () => void
}

function friendlyVerdictLabel(verdict: PlannerDashboardV3Model['decision']['transitionVerdict']) {
  if (verdict === 'Strong') return 'Strong fit'
  if (verdict === 'Possible') return 'Promising path'
  return 'Challenging, still achievable'
}

function simplifyRouteLabel(value: string) {
  return value
    .replace(/^primary route:\s*/i, '')
    .replace(/^best route:\s*/i, '')
    .replace(/^route:\s*/i, '')
    .trim()
}

function toProbabilityClass(value: string) {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*%/)
  const percent = match ? Number(match[1]) : null
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 'text-text-primary'
  if (percent >= 65) return 'text-success'
  return 'text-warning'
}

function MetricFallbackPill({
  value,
  compact = false
}: {
  value: DashboardFallbackValue<string>
  compact?: boolean
}) {
  if (!value.badge) return null
  const variant =
    value.badge === 'Needs data' ? 'warning' : value.badge === 'Estimate' ? 'info' : 'default'
  const label = compact && value.badge === 'Estimate' ? 'Est.' : value.badge
  return (
    <Badge
      variant={variant}
      className={
        compact
          ? 'whitespace-nowrap! px-1! py-0! text-[8px]! font-semibold! leading-[1.05]!'
          : 'whitespace-nowrap! px-1.5! py-0! text-[9px]! font-semibold! leading-[1.1]!'
      }
    >
      {label}
    </Badge>
  )
}

function isLongMetricLayout(
  label: string,
  value: string,
  hasHelper: boolean
) {
  if (hasHelper) return true
  if (label === 'Salary Potential' || label === 'Training Cost' || label === 'Timeline' || label === 'Readiness Estimate') {
    return true
  }
  return value.length > 10 || /\s/.test(value)
}

function formatMetricDisplay(
  label: string,
  metric: DashboardFallbackValue<string>
) {
  const rawValue = metric.value.replace(/CA\$/gi, '$').replace(/-\$/g, '-')
  const value =
    /province wage data unavailable/i.test(rawValue) || /regional estimate unavailable/i.test(rawValue)
      ? 'Need local wage data'
      : rawValue

  if (label === 'Difficulty Score') {
    return {
      value,
      context: null,
      helper: 'Lower means fewer blockers to clear first.',
      showBadge: false
    }
  }

  if (label === 'Timeline') {
    return {
      value,
      context: null,
      helper: 'Based on your current constraints.',
      showBadge: false
    }
  }

  if (label === 'Readiness Estimate' && /^0+(\.0+)?%$/.test(rawValue.trim())) {
    return {
      value: 'Early stage',
      context: null,
      helper: 'This rises as key steps are completed.',
      showBadge: false
    }
  }

  if (label === 'Training Cost' && metric.sourceType === 'estimate' && !/\$|\d/.test(rawValue)) {
    return {
      value: 'Estimate',
      context: null,
      helper: 'Provider pricing varies by city.',
      showBadge: false
    }
  }

  if (label === 'Training Cost' && /\$|\d/.test(rawValue)) {
    const normalizedRange = value.replace(
      /\$?(\d[\d,]*(?:\.\d+)?)\s*-\s*\$?(\d[\d,]*(?:\.\d+)?)/g,
      (_match, left, right) => `$${left}-$${right}`
    )
    const helper =
      metric.sourceType === 'verified'
        ? 'Based on sourced provider pricing.'
        : metric.sourceType === 'derived'
          ? 'Profile-derived estimate; verify with providers.'
          : 'Provider pricing varies by city.'
    return {
      value: normalizedRange,
      context: null,
      helper,
      showBadge: false
    }
  }

  if (label === 'Salary Potential' && value === 'Need local wage data') {
    return {
      value: 'Wage data pending',
      context: null,
      helper: 'Use local postings for now.',
      showBadge: false
    }
  }

  return {
    value,
    context: null,
    helper: null,
    showBadge: Boolean(metric.badge)
  }
}

export function PlannerCommandCenter({
  hero,
  decision,
  pathwayWeighting,
  heroCardChecked,
  onToggleHeroCard
}: PlannerCommandCenterProps) {
  const metrics = [
    {
      label: 'Difficulty Score',
      metric: hero.difficulty,
      valueClass: 'text-text-primary'
    },
    {
      label: 'Timeline',
      metric: hero.timeline,
      valueClass: 'text-text-primary'
    },
    {
      label: 'Readiness Estimate',
      metric: hero.probability,
      valueClass: toProbabilityClass(hero.probability.value)
    },
    {
      label: 'Training Cost',
      metric: hero.trainingCost,
      valueClass: 'text-text-primary'
    },
    {
      label: 'Salary Potential',
      metric: hero.salaryPotential,
      valueClass: 'text-text-primary'
    }
  ] as const

  return (
    <Card className="!rounded-2xl !border-border-light bg-surface px-4 pt-4 pb-4 shadow-card sm:px-5 sm:pt-5 md:px-6 md:pt-6">
      <div className="flex flex-col gap-3.5 md:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-3">
          <p className="text-[11px] font-bold tracking-[0.45px] text-text-secondary">1. Hero Summary Card</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-accent/25 bg-accent-light px-2.5 py-1 text-[10px] font-bold text-accent">
              {pathwayWeighting.label} weighting
            </span>
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-pill border px-2.5 py-1 text-[10px] font-bold transition ${
                heroCardChecked
                  ? 'border-success/35 bg-success/10 text-success'
                  : 'border-border bg-surface text-text-secondary hover:border-accent/30'
              }`}
            >
              <input
                type="checkbox"
                checked={heroCardChecked}
                onChange={onToggleHeroCard}
                className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
              />
              Reviewed
            </label>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[1.1px] text-accent">Transition Focus</p>
            <h2 className="w-full whitespace-pre-line text-[26px] font-bold leading-[1.1] text-text-primary sm:text-[30px] md:text-[38px]">
              {decision.currentRole} {'\u2192'} {decision.targetRole}
            </h2>
            {hero.mappedPathLabel ? (
              <p className="w-full max-w-[80ch] text-[12px] font-semibold leading-[1.5] text-text-tertiary">
                {hero.mappedPathLabel}
              </p>
            ) : null}
            <div className="rounded-xl border border-accent/20 bg-accent-light/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-accent">Plan snapshot</p>
              <p className="mt-1 text-[13px] font-semibold leading-[1.55] text-text-primary">
                {friendlyVerdictLabel(decision.transitionVerdict)}. Start with{' '}
                {simplifyRouteLabel(decision.fastestRoute).toLowerCase() || 'the quickest practical entry route'}.
                Timeline: {decision.estimatedTimeline || hero.timeline.value}.
              </p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning-light p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-warning">Main focus area</p>
              <p className="mt-1 text-[13px] font-semibold leading-[1.5] text-text-primary">{decision.biggestBlocker}</p>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {metrics.map((item, idx) => {
            const { value: displayValue, context, helper, showBadge } = formatMetricDisplay(item.label, item.metric)
            const useLongMetricLayout = isLongMetricLayout(item.label, displayValue, Boolean(helper))

            return (
              <div
                key={`${item.label}-${idx}`}
                className="grid min-h-[108px] grid-rows-[auto_1fr_auto] gap-2 rounded-xl border border-border-light bg-bg-secondary/80 p-3"
              >
                <p className="text-[11px] font-semibold leading-none tracking-[0.2px] text-text-tertiary">
                  {item.label}
                </p>
                <div
                  className={`min-h-[44px] ${
                    useLongMetricLayout
                      ? 'flex flex-col items-start justify-start gap-1'
                      : 'flex items-end justify-between gap-1'
                  }`}
                >
                  {context ? (
                    <p className="text-[10px] font-semibold leading-[1.25] tracking-[0.15px] text-text-tertiary">
                      {context}
                    </p>
                  ) : null}
                  <p
                    className={`min-w-0 ${
                      useLongMetricLayout
                        ? 'whitespace-normal break-words text-[16px] leading-[1.28] sm:text-[17px]'
                        : 'flex-1 whitespace-nowrap text-[24px] leading-[1.08] sm:text-[27px]'
                    } font-bold tracking-[-0.01em] ${item.valueClass}`}
                  >
                    {displayValue}
                  </p>
                  {showBadge ? (
                    <div className="shrink-0">
                      <MetricFallbackPill value={item.metric} compact={useLongMetricLayout} />
                    </div>
                  ) : null}
                </div>
                <p className="min-h-[28px] text-[10.5px] font-medium leading-[1.35] text-text-tertiary">
                  {helper || ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default PlannerCommandCenter
