'use client'

import Badge from '@/components/Badge'
import Card from '@/components/Card'
import type { DashboardFallbackValue, PlannerDashboardV3Model } from '@/lib/planner/v3Dashboard'

interface PlannerCommandCenterProps {
  hero: PlannerDashboardV3Model['hero']
  selectedScenario: string
  onSelectScenario: (label: string) => void
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
  selectedScenario,
  onSelectScenario
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
    <Card className="!rounded-2xl !border-border-light bg-surface px-6 pt-6 pb-4 shadow-card">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold tracking-[0.6px] text-text-secondary">Command Center</p>
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-accent">Transition Focus</p>
            <h2 className="w-full whitespace-pre-line text-3xl font-bold leading-[1.08] text-text-primary md:text-[40px]">
              {hero.title
                .replace(' \u2192 ', ' \u2192\n')
                .replace(' -> ', ' \u2192\n')
                .replace(/\s+to\s+/i, ' \u2192\n')}
            </h2>
            {hero.mappedPathLabel ? (
              <p className="w-full max-w-[80ch] text-[12px] font-semibold leading-[1.5] text-text-tertiary">
                {hero.mappedPathLabel}
              </p>
            ) : null}
            <p className="w-full max-w-[80ch] text-[15px] font-medium leading-[1.55] text-text-secondary">
              {hero.insight}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hero.scenarioModes.map((mode, idx) => (
              <button
                type="button"
                key={`${mode.label}-${idx}`}
                onClick={() => onSelectScenario(mode.label)}
                className={`rounded-pill border px-3 py-[7px] text-xs font-semibold leading-none ${
                  selectedScenario === mode.label
                    ? 'border-accent bg-accent text-text-on-dark'
                    : mode.label === 'Balanced'
                      ? 'border-accent/25 bg-accent-light text-accent'
                      : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-[10px] lg:grid-cols-5">
          {metrics.map((item, idx) => {
            const useLongMetricLayout = isLongMetricLayout(item.label, item.metric)
            const { value: displayValue, showBadge } = formatMetricDisplay(item.label, item.metric)

            return (
              <div
                key={`${item.label}-${idx}`}
                className="flex min-h-[71px] flex-col justify-between gap-2 rounded-xl border border-border bg-bg-secondary p-3"
              >
                <p className="text-[11px] font-semibold leading-none tracking-[0.45px] text-text-secondary">
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
