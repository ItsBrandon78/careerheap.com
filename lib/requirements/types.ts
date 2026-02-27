export type RequirementType =
  | 'gate'
  | 'hard_skill'
  | 'tool'
  | 'experience_signal'
  | 'soft_signal'

export type RequirementEvidenceSource = 'adzuna' | 'user_posting' | 'onet'

export interface RequirementEvidence {
  source: RequirementEvidenceSource
  quote: string
  postingId?: string
  confidence: number
}

export interface ExtractedRequirement {
  type: RequirementType
  label: string
  normalizedKey: string
  confidence: number
  evidence: RequirementEvidence
}

export interface AggregatedRequirement {
  type: RequirementType
  label: string
  normalizedKey: string
  normalized_key: string
  frequency: number
  frequency_count: number
  frequency_percent: number | null
  evidence: RequirementEvidence[]
  evidence_quotes: RequirementEvidence[]
}
