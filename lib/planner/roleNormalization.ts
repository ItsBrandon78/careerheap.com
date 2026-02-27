export type RoleConfidenceLabel = 'Exact' | 'Close' | 'Broad' | 'Unclear'

export function scoreToLabel(score: number): RoleConfidenceLabel {
  if (!Number.isFinite(score)) return 'Unclear'
  if (score >= 0.92) return 'Exact'
  if (score >= 0.8) return 'Close'
  if (score >= 0.65) return 'Broad'
  return 'Unclear'
}

export function shouldShowSimilarRoles(label: RoleConfidenceLabel) {
  return label !== 'Exact'
}

export function taxonomySourceLabel(options: {
  source?: string | null
  region?: 'CA' | 'US' | null
}) {
  const source = String(options.source ?? '').toLowerCase()
  if (source.includes('onet') || source.includes('o*net')) return 'O*NET'
  if (source.includes('noc') || source.includes('oasis')) return 'NOC/O*NET'
  if (options.region === 'CA') return 'NOC/O*NET'
  return 'O*NET'
}
