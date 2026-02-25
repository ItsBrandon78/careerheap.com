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
  { name: 'Procore', aliases: ['procore'] },
  { name: 'SAP', aliases: ['sap', 'sap s4', 's/4hana'] },
  { name: 'QuickBooks', aliases: ['quickbooks'] },
  { name: 'ServiceNow', aliases: ['servicenow'] },
  { name: 'Shopify', aliases: ['shopify'] },
  { name: 'WordPress', aliases: ['wordpress'] },
  { name: 'ArcGIS', aliases: ['arcgis'] },
  { name: 'MATLAB', aliases: ['matlab'] },
  { name: 'Photoshop', aliases: ['photoshop', 'adobe photoshop'] },
  { name: 'Illustrator', aliases: ['illustrator', 'adobe illustrator'] },
  { name: 'InDesign', aliases: ['indesign', 'adobe indesign'] },
  { name: 'Canva', aliases: ['canva'] },
  { name: 'SCADA Systems', aliases: ['scada'] },
  { name: 'EMR Systems', aliases: ['emr', 'electronic medical record', 'epic', 'cerner'] },
  { name: 'PLC Systems', aliases: ['plc', 'programmable logic controller'] },
  { name: 'Conduit Bender', aliases: ['conduit bender', 'emt bender'] }
]

const TOOL_SIGNAL_TOKENS = new Set([
  'api',
  'apis',
  'arcgis',
  'autocad',
  'aws',
  'azure',
  'cad',
  'canva',
  'cerner',
  'crm',
  'docker',
  'emr',
  'epic',
  'erp',
  'excel',
  'figma',
  'gcp',
  'gis',
  'git',
  'github',
  'hubspot',
  'illustrator',
  'indesign',
  'jira',
  'kubernetes',
  'looker',
  'matlab',
  'mysql',
  'node',
  'node.js',
  'photoshop',
  'plc',
  'power',
  'postgresql',
  'procore',
  'python',
  'quickbooks',
  'react',
  'revit',
  'sap',
  'salesforce',
  'scada',
  'servicenow',
  'shopify',
  'snowflake',
  'sql',
  'tableau',
  'terraform',
  'wireshark',
  'wordpress'
])

const GENERIC_TOOL_PHRASES = new Set([
  'software',
  'software tools',
  'systems',
  'tools',
  'platforms',
  'technology',
  'technical tools',
  'relevant tools',
  'industry tools'
])

const TOOL_CONTEXT_PATTERN =
  /\b(?:experience|proficiency|familiarity|knowledge|expertise|hands[-\s]on(?: experience)?|working)\s+(?:with|in|using)\s+([^.:\n;]{3,140})/gi

function containsWholeTerm(haystack: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack)
}

function stripCandidateNoise(value: string) {
  return value
    .replace(/\b(?:preferred|required|is required|is preferred|nice to have|asset|plus)\b/gi, '')
    .replace(/^[\s:;,.!?-]+|[\s:;,.!?-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalToolName(raw: string) {
  const trimmed = stripCandidateNoise(raw)
  if (!trimmed) return null

  const normalized = normalizeRequirementKey(trimmed)
  if (!normalized || GENERIC_TOOL_PHRASES.has(normalized)) return null

  for (const tool of TOOL_ALIASES) {
    const alias = tool.aliases.find((item) =>
      containsWholeTerm(normalized, normalizeRequirementKey(item))
    )
    if (alias) return tool.name
  }

  const tokens = normalized.split(' ').filter(Boolean)
  if (tokens.length > 5) return null

  const hasSignalToken = tokens.some((token) => TOOL_SIGNAL_TOKENS.has(token))
  const hasStructuredSignal =
    /[+#./]/.test(trimmed) || /\b[A-Z]{2,}\b/.test(trimmed) || /\d/.test(trimmed)

  if (!hasSignalToken && !hasStructuredSignal) return null

  return trimmed
}

function extractToolCandidatesFromContext(input: string) {
  const output: string[] = []
  for (const match of input.matchAll(TOOL_CONTEXT_PATTERN)) {
    const group = match[1]
    if (!group) continue
    const pieces = group.split(/\s*(?:,|\/|&|\band\b|\bor\b)\s*/i)
    for (const piece of pieces) {
      const toolName = canonicalToolName(piece)
      if (toolName) output.push(toolName)
    }
  }
  return output
}

export function extractToolMentions(input: string) {
  const normalized = normalizeRequirementKey(input)
  const matches: string[] = []
  const seen = new Set<string>()

  for (const tool of TOOL_ALIASES) {
    const found = tool.aliases.some((alias) =>
      containsWholeTerm(normalized, normalizeRequirementKey(alias))
    )
    if (!found) continue
    const key = normalizeRequirementKey(tool.name)
    if (seen.has(key)) continue
    seen.add(key)
    matches.push(tool.name)
  }

  const contextual = extractToolCandidatesFromContext(input)
  for (const tool of contextual) {
    const key = normalizeRequirementKey(tool)
    if (!key || seen.has(key)) continue
    seen.add(key)
    matches.push(tool)
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
