'use client'

import Badge from '@/components/Badge'
import Card from '@/components/Card'
import type { DashboardFallbackValue, PlannerDashboardV3Model } from '@/lib/planner/v3Dashboard'

interface PlannerCommandCenterProps {
  hero: PlannerDashboardV3Model['hero']
  decision: PlannerDashboardV3Model['decision']
  pathwayWeighting: PlannerDashboardV3Model['pathwayWeighting']
  selectedScenario: string
  onSelectScenario: (label: string) => void
  heroCardChecked: boolean
  onToggleHeroCard: () => void
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
  metric: DashboardFallbackValue<string>
) {
  if (!metric.badge) return false
  if (label === 'Salary Potential' || label === 'Training Cost') return true
  return metric.value.length > 14 || /\s/.test(metric.value)
}

function formatMetricDisplay(
  label: string,
  metric: DashboardFallbackValue<string>
) {
  const rawValue = metric.value.replace(/CA\$/gi, '$').replace(/-\$/g, '-')

  if (label === 'Training Cost' && metric.sourceType === 'estimate' && !/\$|\d/.test(rawValue)) {
    return {
      value: 'Est.',
      showBadge: false
    }
  }

  return {
    value: rawValue,
    showBadge: Boolean(metric.badge)
  }
}

export function PlannerCommandCenter({
  hero,
  decision,
  pathwayWeighting,
  selectedScenario,
  onSelectScenario,
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
      label: 'Success Probability',
      metric: hero.probability,
      valueClass: 'text-success'
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
    <Card className="!rounded-2xl !border-border-light bg-surface px-5 pt-5 pb-5 shadow-card md:px-6 md:pt-6">
      <div className="flex flex-col gap-4">
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
              Done
            </label>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[1.1px] text-accent">Transition Focus</p>
            <h2 className="w-full whitespace-pre-line text-[30px] font-bold leading-[1.08] text-text-primary md:text-[38px]">
              {decision.currentRole} {'\u2192'} {decision.targetRole}
            </h2>
            {hero.mappedPathLabel ? (
              <p className="w-full max-w-[80ch] text-[12px] font-semibold leading-[1.5] text-text-tertiary">
                {hero.mappedPathLabel}
              </p>
            ) : null}
            <div className="rounded-xl border border-accent/20 bg-accent-light/40 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-accent">Decision brief</p>
              <p className="mt-1 text-[13px] font-semibold leading-[1.55] text-text-primary">
                Verdict: {decision.transitionVerdict}. Best entry route: {decision.fastestRoute}. Estimated
                timeline: {decision.estimatedTimeline}. First blocker to clear: {decision.biggestBlocker}.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-border-light bg-bg-secondary/90 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Transition verdict</p>
                <p className="mt-1 text-[15px] font-bold text-text-primary">{decision.transitionVerdict}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-bg-secondary/90 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Best entry route</p>
                <p className="mt-1 text-[13px] font-semibold leading-[1.5] text-text-primary">{decision.fastestRoute}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-bg-secondary/90 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Estimated timeline</p>
                <p className="mt-1 text-[13px] font-semibold leading-[1.5] text-text-primary">{decision.estimatedTimeline}</p>
              </div>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning-light p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[1.05px] text-warning">Biggest blocker</p>
              <p className="mt-1 text-[13px] font-semibold leading-[1.5] text-text-primary">{decision.biggestBlocker}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-light bg-bg-secondary p-1.5">
            <span className="px-2 text-[10px] font-bold uppercase tracking-[1.05px] text-text-tertiary">Path view</span>
            {hero.scenarioModes.map((mode, idx) => (
              <button
                type="button"
                key={`${mode.label}-${idx}`}
                onClick={() => onSelectScenario(mode.label)}
                className={`rounded-pill border px-3 py-1.5 text-[11px] font-semibold leading-none transition ${
                  selectedScenario === mode.label
                    ? 'border-accent bg-accent text-text-on-dark'
                    : mode.label === 'Balanced'
                      ? 'border-accent/25 bg-accent-light text-accent hover:border-accent/35'
                      : 'border-border bg-surface text-text-secondary hover:border-accent/25'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-[10px] sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((item, idx) => {
            const useLongMetricLayout = isLongMetricLayout(item.label, item.metric)
            const { value: displayValue, showBadge } = formatMetricDisplay(item.label, item.metric)

            return (
              <div
                key={`${item.label}-${idx}`}
                className="flex min-h-[74px] flex-col justify-between gap-2 rounded-xl border border-border-light bg-bg-secondary/80 p-3"
              >
                <p className="text-[10px] font-bold leading-none tracking-[1px] text-text-tertiary">
                  {item.label}
                </p>
                <div className={`flex ${useLongMetricLayout ? 'flex-col items-start gap-1' : 'items-end gap-1'}`}>
                  <p
                    className={`min-w-0 ${
                      useLongMetricLayout
                        ? 'whitespace-normal break-words text-[17px] leading-[1.05]'
                        : 'flex-1 whitespace-nowrap text-[20px] leading-[1.1]'
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
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default PlannerCommandCenter
