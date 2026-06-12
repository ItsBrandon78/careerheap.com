'use client'

import Link from 'next/link'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Badge from '@/components/Badge'
import type { ScoredJob, JobFitTier } from '@/lib/planner/jobRecommendations'

export type JobsView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; jobs: ScoredJob[] }

const TIER_META: Record<JobFitTier, { label: string; icon: string; badge: 'success' | 'info' | 'warning' }> = {
  strong: { label: 'Strong match', icon: '●●●', badge: 'success' },
  stretch: { label: 'Stretch', icon: '●●○', badge: 'info' },
  reach: { label: 'Reach', icon: '●○○', badge: 'warning' }
}

function postedDaysAgo(postedAt?: string | null): string | null {
  if (!postedAt) return null
  const ts = Date.parse(postedAt)
  if (!Number.isFinite(ts)) return null
  const days = Math.max(0, Math.round((Date.now() - ts) / 86_400_000))
  return days === 0 ? 'Posted today' : `Posted ${days}d ago`
}

function salaryLabel(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  return fmt((min || max) as number)
}

export function JobsYouCanWinCard({
  view,
  targetRole,
  location,
  isProUser,
  loggedJobIds,
  onApply,
  onLogApplication,
  onCoverLetter,
  onTailorResume,
  onRetry
}: {
  view: JobsView
  targetRole: string
  location: string
  isProUser: boolean
  loggedJobIds: Record<string, boolean>
  onApply: (job: ScoredJob) => void
  onLogApplication: (job: ScoredJob) => void
  onCoverLetter: (job: ScoredJob) => void
  onTailorResume: (job: ScoredJob) => void
  onRetry: () => void
}) {
  // Hide the card entirely when there is nothing useful to show (spec: no empty boxes).
  if (view.status === 'success' && view.jobs.length === 0) return null

  return (
    <Card className="!rounded-2xl !border-border-light bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light pb-3">
        <h2 className="text-[18px] font-bold leading-[1.25] text-text-primary md:text-[20px]">
          Jobs you can win
        </h2>
        <Badge variant="info">Live</Badge>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-text-secondary">
        Real openings for {targetRole || 'your target role'} near {location || 'you'}, ranked by how well you match.
      </p>

      {view.status === 'loading' ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading job matches</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border-light bg-bg-secondary" />
          ))}
        </div>
      ) : null}

      {view.status === 'error' ? (
        <div className="mt-4 rounded-xl border border-border-light bg-bg-secondary p-4" role="alert">
          <p className="text-[13px] font-semibold text-text-secondary">
            We couldn&rsquo;t load live jobs just now.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}

      {view.status === 'success' ? (
        <ul className="mt-4 space-y-3">
          {view.jobs.map((job) => {
            const tier = TIER_META[job.fit.tier]
            const posted = postedDaysAgo(job.postedAt)
            const salary = salaryLabel(job.salaryMin, job.salaryMax)
            const logged = Boolean(loggedJobIds[job.id])
            return (
              <li key={job.id} className="rounded-xl border border-border-light bg-bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-text-primary">
                      {job.title} <span className="font-semibold text-text-secondary">· {job.company}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-text-tertiary">{job.location}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-bold ${
                      tier.badge === 'success'
                        ? 'border-success/25 bg-success/10 text-success'
                        : tier.badge === 'info'
                          ? 'border-accent/25 bg-accent-light text-accent'
                          : 'border-warning/25 bg-warning-light text-warning'
                    }`}
                  >
                    <span aria-hidden="true">{tier.icon}</span>
                    {tier.label}
                  </span>
                </div>

                <p className="mt-2 text-[12px] font-semibold text-text-secondary">
                  {job.fit.totalCount > 0
                    ? `You meet ${job.fit.metCount} of ${job.fit.totalCount} requirements.`
                    : 'Match detail unavailable for this posting.'}
                </p>

                {job.fit.matched.length > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    Matched: {job.fit.matched.map((m) => m.label).join(', ')}
                  </p>
                ) : null}
                {job.fit.missing.length > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    Still need: {job.fit.missing.map((m) => m.label).join(', ')}
                  </p>
                ) : null}

                {salary || posted ? (
                  <p className="mt-1 text-[11px] font-semibold text-text-tertiary">
                    {[salary, posted].filter(Boolean).join(' · ')}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onApply(job)}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLogApplication(job)}
                    aria-pressed={logged}
                  >
                    {logged ? 'Logged ✓' : 'Log application'}
                  </Button>
                  {isProUser ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => onCoverLetter(job)}>
                        Cover letter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onTailorResume(job)}>
                        Tailor resume
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {view.status === 'success' && !isProUser ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent-light/40 p-4">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-accent">Tailor your application for each job</p>
            <p className="mt-1 text-[11px] font-semibold leading-[1.55] text-text-secondary">
              Pro and Lifetime members get a tailored cover letter and resume guidance per posting.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button size="sm">Upgrade</Button>
          </Link>
        </div>
      ) : null}

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[1px] text-text-tertiary">
        Jobs by Adzuna
      </p>
    </Card>
  )
}

export default JobsYouCanWinCard
