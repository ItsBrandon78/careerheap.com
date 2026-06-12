import type { ScoredJob, JobFitTier } from '@/lib/planner/jobRecommendations'

const TIER_RANK: Record<JobFitTier, number> = { strong: 3, stretch: 2, reach: 1 }
const MAX_RESULTS = 6

function compareJobs(left: ScoredJob, right: ScoredJob): number {
  const tierDelta = TIER_RANK[right.fit.tier] - TIER_RANK[left.fit.tier]
  if (tierDelta !== 0) return tierDelta
  if (right.fit.metCount !== left.fit.metCount) return right.fit.metCount - left.fit.metCount
  return (right.postedAt ?? '').localeCompare(left.postedAt ?? '')
}

export function rankScoredJobs(jobs: ScoredJob[], targetRole: string): ScoredJob[] {
  const deduped = jobs.filter(
    (job, index, all) => all.findIndex((candidate) => candidate.id === job.id) === index
  )
  const ranked = [...deduped].sort(compareJobs)
  const top = ranked.slice(0, MAX_RESULTS)

  // Guarantee at least one bridge-role result (a "fastest way in") when present.
  const normalizedTarget = targetRole.trim().toLowerCase()
  const hasBridge = top.some((job) => job.matchedRole.trim().toLowerCase() !== normalizedTarget)
  if (!hasBridge) {
    const bridge = ranked.find((job) => job.matchedRole.trim().toLowerCase() !== normalizedTarget)
    if (bridge && top.length === MAX_RESULTS) {
      top[MAX_RESULTS - 1] = bridge
    } else if (bridge) {
      top.push(bridge)
    }
  }
  return top
}
