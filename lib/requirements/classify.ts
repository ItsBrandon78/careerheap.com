import type { RequirementType } from '@/lib/requirements/types'
import { normalizeRequirementKey } from '@/lib/requirements/normalize'

const GATE_PATTERN =
  /\b(license|licen[cs]e|certif(?:ication|ied)?|registration|registered|clearance|bondable|red seal|journeyperson|journeyman|apprenticeship|nclex|rn\b|cpr|bls|acls|security clearance)\b/i

const EXPERIENCE_PATTERN =
  /\b(\d+\+?\s*(years|yrs|year)|portfolio|shipped|published|clinical|rotations|managed\s+\$|managed budget|production experience|field experience)\b/i

const SOFT_SIGNAL_PATTERN =
  /\b(communication|leadership|teamwork|stakeholder|collaboration|customer service|presentation|problem solving)\b/i

const TOOL_ALIASES: Array<{ name: string; aliases: string[] }> = [
  { name: 'Excel', aliases: ['excel', 'spreadsheet', 'google sheets'] },
  { name: 'AutoCAD', aliases: ['autocad'] },
  { name: 'Revit', aliases: ['revit'] },
  { name: 'SolidWorks', aliases: ['solidworks'] },
  { name: 'Salesforce', aliases: ['salesforce'] },
  { name: 'HubSpot', aliases: ['hubspot'] },
  { name: 'Google Analytics', aliases: ['google analytics', 'ga4'] },
  { name: 'Google Ads', aliases: ['google ads', 'adwords'] },
  { name: 'Meta Ads', aliases: ['meta ads', 'facebook ads'] },
  { name: 'Jira', aliases: ['jira'] },
  { name: 'Figma', aliases: ['figma'] },
  { name: 'Python', aliases: ['python'] },
  { name: 'SQL', aliases: ['sql', 'postgresql', 'mysql', 'sql server'] },
  { name: 'Tableau', aliases: ['tableau'] },
  { name: 'Power BI', aliases: ['power bi'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { name: 'GCP', aliases: ['gcp', 'google cloud'] },
  { name: 'Git', aliases: ['git', 'github', 'gitlab'] },
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node.js'] },
  { name: 'React', aliases: ['react', 'reactjs'] },
  { name: 'Docker', aliases: ['docker'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'EMR Systems', aliases: ['emr', 'electronic medical record', 'epic', 'cerner'] },
  { name: 'PLC Systems', aliases: ['plc', 'programmable logic controller'] },
  { name: 'Conduit Bender', aliases: ['conduit bender', 'emt bender'] }
]

function containsWholeTerm(haystack: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack)
}

export function extractToolMentions(input: string) {
  const normalized = normalizeRequirementKey(input)
  const matches: string[] = []

  for (const tool of TOOL_ALIASES) {
    const found = tool.aliases.some((alias) =>
      containsWholeTerm(normalized, normalizeRequirementKey(alias))
    )
    if (found) matches.push(tool.name)
  }

  return matches
}

export function hasGateSignal(input: string) {
  return GATE_PATTERN.test(input)
}

export function hasExperienceSignal(input: string) {
  return EXPERIENCE_PATTERN.test(input)
}

export function hasSoftSignal(input: string) {
  return SOFT_SIGNAL_PATTERN.test(input)
}

export function classifyRequirement(input: string): RequirementType {
  if (hasGateSignal(input)) return 'gate'
  if (extractToolMentions(input).length > 0) return 'tool'
  if (hasExperienceSignal(input)) return 'experience_signal'
  if (hasSoftSignal(input)) return 'soft_signal'
  return 'hard_skill'
}
