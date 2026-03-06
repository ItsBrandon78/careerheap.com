import type {
  TemplateOutput,
  TransitionPlanContext,
  TransitionPlanPhase,
  TransitionResource
} from '@/lib/transition/types'

export const PROOF_BUILDER_TERM = 'Proof Builder'
export const PROOF_BUILDER_DEFINITION =
  'Proof Builder = one safe, focused work sample or practice artifact you can show in interviews, plus 3 short bullets explaining what you did and what it proves.'

export function defineOnce(definitions: Record<string, string>, key: string, value: string) {
  if (!definitions[key]) {
    definitions[key] = value
  }
}

export function makePhase(
  phase: string,
  weeks: string,
  tasks: string[],
  weeklyTargets: string[],
  timePerWeekHours: number
): TransitionPlanPhase {
  return {
    phase,
    weeks,
    tasks,
    weeklyTargets,
    timePerWeekHours
  }
}

export function roleLabel(context: TransitionPlanContext) {
  const fromInput = context.targetResolution?.rawInputTitle?.trim()
  if (fromInput) return fromInput

  return [context.targetResolution?.specialization, context.targetResolution?.stage, context.targetResolution?.title]
    .filter((value) => Boolean(value && value.trim()))
    .join(' ')
    .trim() || context.targetRole || 'your target role'
}

export function progressionLabel(context: TransitionPlanContext) {
  return context.relationship === 'within_career_progression' ? 'next step in this career' : roleLabel(context)
}

export function mergeResourceLists(
  primary: TransitionResource[],
  fallback: TransitionResource[],
  max: number
) {
  const seen = new Set<string>()
  const output: TransitionResource[] = []
  for (const item of [...primary, ...fallback]) {
    const label = item.label.trim()
    const url = item.url.trim()
    if (!label) continue
    const key = `${label.toLowerCase()}|${url.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ label, url })
    if (output.length >= max) break
  }
  return output
}

export function buildTemplateResources(
  context: TransitionPlanContext,
  fallbackLocal: TransitionResource[],
  fallbackOnline: TransitionResource[]
) {
  const sourceLocal = [
    ...(context.report.targetRequirements?.sources ?? []),
    ...((context.report.suggestedCareers[0]?.officialLinks ?? []).map((item) => ({
      label: item.label,
      url: item.url
    })))
  ]
  const sourceOnline = (context.report.linksResources ?? []).map((item) => ({
    label: item.label,
    url: item.url
  }))

  return {
    local: mergeResourceLists(sourceLocal, fallbackLocal, 4),
    online: mergeResourceLists(sourceOnline, fallbackOnline, 6)
  }
}

export function buildBaseTemplateOutput(
  context: TransitionPlanContext,
  template: Omit<TemplateOutput, 'resources'> & {
    fallbackLocal: TransitionResource[]
    fallbackOnline: TransitionResource[]
  }
): TemplateOutput {
  const resources = buildTemplateResources(context, template.fallbackLocal, template.fallbackOnline)
  return {
    definitions: template.definitions,
    routes: template.routes,
    plan90: template.plan90,
    execution: template.execution,
    resources
  }
}
