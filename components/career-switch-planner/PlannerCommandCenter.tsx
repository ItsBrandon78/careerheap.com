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
    <Card className="!rounded-2xl !border-border-light bg-surface p-7 shadow-card">
      <div className="flex flex-col gap-[14px]">
        <p className="text-[11px] font-semibold tracking-[0.6px] text-text-secondary">Command Center</p>
        <div className="flex w-full flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-accent">Transition Focus</p>
          <h2 className="w-full whitespace-pre-line text-3xl font-bold leading-[1.08] text-text-primary md:text-[40px]">
            {hero.title
              .replace(' \u2192 ', ' \u2192\n')
              .replace(' -> ', ' \u2192\n')
              .replace(/\s+to\s+/i, ' \u2192\n')}
          </h2>
          <p className="w-full max-w-[80ch] text-[15px] font-medium leading-[1.55] text-text-secondary">
            {hero.insight}
          </p>
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
        <div className="grid w-full grid-cols-2 gap-[10px] lg:[grid-template-columns:repeat(5,168px)] lg:justify-between">
          {metrics.map((item, idx) => {
            const isSalaryEstimate =
              item.label === 'Salary Potential' && item.metric.badge === 'Estimate'
            const displayValue = isSalaryEstimate ? item.metric.value.replace(/-\$/g, '-') : item.metric.value

            return (
              <div
                key={`${item.label}-${idx}`}
                className="flex min-h-[71px] flex-col justify-between gap-2 rounded-xl border border-border bg-bg-secondary p-3"
              >
                <p className="text-[11px] font-semibold leading-none tracking-[0.45px] text-text-secondary">
                  {item.label}
                </p>
                <div className={`flex ${isSalaryEstimate ? 'flex-col items-start gap-1' : 'items-end gap-1'}`}>
                  <p
                    className={`min-w-0 ${
                      isSalaryEstimate
                        ? 'whitespace-normal break-words text-[17px] leading-[1.05]'
                        : 'flex-1 whitespace-nowrap text-[20px] leading-[1.1]'
                    } font-bold tracking-[-0.01em] ${item.valueClass}`}
                  >
                    {displayValue}
                  </p>
                  {item.metric.badge ? (
                    <div className="shrink-0">
                      <MetricFallbackPill value={item.metric} compact={isSalaryEstimate} />
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
