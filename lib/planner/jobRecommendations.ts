export type PlannerJobRecommendationInput = {
  id: string
  title: string
  company: string
  location: string
  description: string
  sourceUrl: string
}

export type PlannerJobRecommendationCard = PlannerJobRecommendationInput & {
  reasons: [string, string]
}

export type PlannerJobRecommendationView =
  | { status: 'loading'; items: []; message: string }
  | { status: 'error'; items: []; message: string }
  | { status: 'empty'; items: []; message: string }
  | { status: 'success'; items: PlannerJobRecommendationCard[]; message: string }

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildPlannerJobRecommendationCards(
  jobs: PlannerJobRecommendationInput[],
  targetRole: string,
  location: string,
  signals: string[] = []
) {
  const normalizedRole = targetRole.trim() || 'your target role'

  return jobs
    .filter((job, index, collection) => collection.findIndex((item) => item.id === job.id) === index)
    .slice(0, 6)
    .map((job) => {
      const description = normalizeText(job.description)
      const matchedSignal =
        signals.find((signal) => signal && description.includes(normalizeText(signal))) ?? null
      const locationNote =
        job.location && normalizeText(job.location) !== normalizeText(location)
          ? `This gives you a concrete employer example for ${normalizedRole} near ${job.location}.`
          : `This is a live employer example for ${normalizedRole} in your selected market.`

      return {
        ...job,
        reasons: [
          locationNote,
          matchedSignal
            ? `The posting reinforces ${matchedSignal}, so you can tailor your story to a real requirement.`
            : 'Use this posting to tailor your plan to a real job description instead of generic assumptions.'
        ] as [string, string]
      }
    })
}

export function derivePlannerJobRecommendationView(input: {
  status: 'loading' | 'error' | 'idle' | 'success'
  jobs: PlannerJobRecommendationInput[]
  targetRole: string
  location: string
  signals?: string[]
  message?: string
  baselineOnly?: boolean
}): PlannerJobRecommendationView {
  if (input.status === 'loading') {
    return { status: 'loading', items: [], message: 'Loading live job matches...' }
  }

  if (input.status === 'error') {
    return {
      status: 'error',
      items: [],
      message: input.message || 'Unable to load job recommendations right now.'
    }
  }

  const items = buildPlannerJobRecommendationCards(
    input.jobs,
    input.targetRole,
    input.location,
    input.signals ?? []
  )

  if (items.length === 0) {
    return {
      status: 'empty',
      items: [],
      message:
        input.message ||
        (input.baselineOnly
          ? 'Live job data is thin right now. Try refreshing, widening the location, or pasting a specific posting.'
          : 'No job matches came back yet. Try a broader title, a nearby city, or refresh the search.')
    }
  }

  return {
    status: 'success',
    items,
    message: ''
  }
}
