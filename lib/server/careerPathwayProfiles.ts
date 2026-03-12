import { BUILT_IN_CAREER_PATHWAY_PROFILES } from '@/lib/career-pathway/examples'
import {
  CareerPathwayProfileSchema,
  type CareerPathwayProfile
} from '@/lib/career-pathway/schema'
import { createAdminClient } from '@/lib/supabase/admin'

type LookupArgs = {
  occupationId?: string | null
  targetRole?: string | null
  region?: string | null
  tradeCode?: string | null
  nocCode?: string | null
  onetSocCode?: string | null
}

type CareerRoleRow = {
  id: string
  occupation_id: string | null
  slug: string
  title: string
  trade_code: string | null
  noc_2021_code: string | null
  onet_soc_code: string | null
  jurisdiction_country: string | null
  jurisdiction_region: string | null
}

type StarterCertBundleItem = {
  type: string
  name: string
  details: string
  source_title: string
  source_url: string
  provider: string
}

type TradeFamily =
  | 'construction'
  | 'industrial'
  | 'utility'
  | 'motive_power'
  | 'service'

const TRADE_TITLE_ALIASES: Array<{ match: RegExp; title: string; tradeCode?: string }> = [
  { match: /\bapprentice electrician\b/i, title: 'Electrician Construction and Maintenance', tradeCode: '309A' },
  { match: /^\belectrician\b$/i, title: 'Electrician Construction and Maintenance', tradeCode: '309A' },
  { match: /\bindustrial electrician\b/i, title: 'Industrial Electrician', tradeCode: '442A' },
  { match: /\bapprentice plumber\b/i, title: 'Plumber', tradeCode: '306A' },
  { match: /^\bplumber\b$/i, title: 'Plumber', tradeCode: '306A' },
  { match: /\bmillwright\b/i, title: 'Industrial Mechanic Millwright', tradeCode: '433A' },
  { match: /\bhvac\b|\brefrigeration\b|\bac mechanic\b/i, title: 'Refrigeration and Air Conditioning Systems Mechanic', tradeCode: '313A' },
  { match: /\bpowerline\b/i, title: 'Powerline Technician', tradeCode: '434A' },
  { match: /\bcarpenter\b/i, title: 'General Carpenter', tradeCode: '403A' },
]

const REGION_ALIASES: Array<{ code: string; patterns: string[] }> = [
  { code: 'ON', patterns: ['ontario'] },
  { code: 'BC', patterns: ['british columbia'] },
  { code: 'AB', patterns: ['alberta'] },
  { code: 'SK', patterns: ['saskatchewan'] },
  { code: 'MB', patterns: ['manitoba'] },
  { code: 'QC', patterns: ['quebec'] },
  { code: 'NB', patterns: ['new brunswick'] },
  { code: 'NS', patterns: ['nova scotia'] },
  { code: 'PE', patterns: ['prince edward island'] },
  { code: 'NL', patterns: ['newfoundland', 'labrador'] },
  { code: 'YT', patterns: ['yukon'] },
  { code: 'NT', patterns: ['northwest territories'] },
  { code: 'NU', patterns: ['nunavut'] }
]

const OFFICIAL_SOURCE_URLS = {
  whmis: 'https://www.ccohs.ca/oshanswers/chemicals/whmis_ghs/general.html',
  workingAtHeights: 'https://www.ontario.ca/page/training-working-heights',
  workerAwareness: 'https://www.ontario.ca/document/worker-health-and-safety-awareness-workbook',
  lockout: 'https://www.ccohs.ca/oshanswers/safety_haz/lockout.html',
  firstAid: 'https://www.wsib.ca/en/businesses/health-and-safety/first-aid-program',
  confinedSpace: 'https://www.ccohs.ca/oshanswers/hsprograms/confinedspace.html'
} as const

const TRADE_FAMILY_STARTER_CERT_BUNDLES: Record<TradeFamily, StarterCertBundleItem[]> = {
  construction: [
    {
      type: 'health_safety',
      name: 'Working at Heights',
      details: 'Required on Ontario construction projects where fall hazards are present.',
      source_title: 'Ontario Working at Heights training',
      source_url: OFFICIAL_SOURCE_URLS.workingAtHeights,
      provider: 'Approved Ontario training provider'
    },
    {
      type: 'health_safety',
      name: 'Worker Health and Safety Awareness',
      details: 'Ontario baseline worker awareness training used across construction entry routes.',
      source_title: 'Ontario Worker Health and Safety Awareness workbook',
      source_url: OFFICIAL_SOURCE_URLS.workerAwareness,
      provider: 'Ontario workplace safety awareness source'
    },
    {
      type: 'health_safety',
      name: 'WHMIS',
      details: 'Common hazardous materials training expected on many job sites and maintenance crews.',
      source_title: 'CCOHS WHMIS guidance',
      source_url: OFFICIAL_SOURCE_URLS.whmis,
      provider: 'Employer or approved Canadian training provider'
    }
  ],
  industrial: [
    {
      type: 'health_safety',
      name: 'Lockout Tagout (LOTO)',
      details: 'Frequently required when servicing industrial equipment and energized machinery.',
      source_title: 'CCOHS Lockout / Tagout guidance',
      source_url: OFFICIAL_SOURCE_URLS.lockout,
      provider: 'Employer or industrial safety training provider'
    },
    {
      type: 'health_safety',
      name: 'Worker Health and Safety Awareness',
      details: 'Ontario baseline worker awareness training for industrial and maintenance sites.',
      source_title: 'Ontario Worker Health and Safety Awareness workbook',
      source_url: OFFICIAL_SOURCE_URLS.workerAwareness,
      provider: 'Ontario workplace safety awareness source'
    },
    {
      type: 'health_safety',
      name: 'WHMIS',
      details: 'Hazardous materials training is a common baseline for factory and maintenance environments.',
      source_title: 'CCOHS WHMIS guidance',
      source_url: OFFICIAL_SOURCE_URLS.whmis,
      provider: 'Employer or approved Canadian training provider'
    }
  ],
  utility: [
    {
      type: 'health_safety',
      name: 'Confined Space Entry',
      details: 'Often required where utility, infrastructure, pit, vault, or enclosed-space work appears.',
      source_title: 'CCOHS confined spaces guidance',
      source_url: OFFICIAL_SOURCE_URLS.confinedSpace,
      provider: 'Employer or confined-space training provider'
    },
    {
      type: 'health_safety',
      name: 'Standard First Aid',
      details: 'Field crews commonly need first-aid coverage for remote or infrastructure work.',
      source_title: 'WSIB first aid program',
      source_url: OFFICIAL_SOURCE_URLS.firstAid,
      provider: 'WSIB-approved first aid provider'
    },
    {
      type: 'health_safety',
      name: 'Worker Health and Safety Awareness',
      details: 'Ontario baseline worker awareness training for utility and field-entry roles.',
      source_title: 'Ontario Worker Health and Safety Awareness workbook',
      source_url: OFFICIAL_SOURCE_URLS.workerAwareness,
      provider: 'Ontario workplace safety awareness source'
    }
  ],
  motive_power: [
    {
      type: 'health_safety',
      name: 'Lockout Tagout (LOTO)',
      details: 'Useful for powered equipment service, diagnostics, and safe isolation routines.',
      source_title: 'CCOHS Lockout / Tagout guidance',
      source_url: OFFICIAL_SOURCE_URLS.lockout,
      provider: 'Employer or industrial safety training provider'
    },
    {
      type: 'health_safety',
      name: 'WHMIS',
      details: 'Common baseline for shop chemicals, lubricants, and hazardous products.',
      source_title: 'CCOHS WHMIS guidance',
      source_url: OFFICIAL_SOURCE_URLS.whmis,
      provider: 'Employer or approved Canadian training provider'
    },
    {
      type: 'health_safety',
      name: 'Worker Health and Safety Awareness',
      details: 'Ontario worker awareness training commonly expected in shop and yard environments.',
      source_title: 'Ontario Worker Health and Safety Awareness workbook',
      source_url: OFFICIAL_SOURCE_URLS.workerAwareness,
      provider: 'Ontario workplace safety awareness source'
    }
  ],
  service: [
    {
      type: 'health_safety',
      name: 'WHMIS',
      details: 'A practical baseline when the role involves chemicals, cleaning products, or food-safety environments.',
      source_title: 'CCOHS WHMIS guidance',
      source_url: OFFICIAL_SOURCE_URLS.whmis,
      provider: 'Employer or approved Canadian training provider'
    },
    {
      type: 'health_safety',
      name: 'Standard First Aid',
      details: 'Often useful where customer-facing or site-support work benefits from certified first-aid coverage.',
      source_title: 'WSIB first aid program',
      source_url: OFFICIAL_SOURCE_URLS.firstAid,
      provider: 'WSIB-approved first aid provider'
    },
    {
      type: 'health_safety',
      name: 'Worker Health and Safety Awareness',
      details: 'Ontario baseline worker awareness training for entry-level regulated work settings.',
      source_title: 'Ontario Worker Health and Safety Awareness workbook',
      source_url: OFFICIAL_SOURCE_URLS.workerAwareness,
      provider: 'Ontario workplace safety awareness source'
    }
  ]
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function applyTradeAlias(args: LookupArgs): LookupArgs {
  const targetRole = String(args.targetRole ?? '').trim()
  if (!targetRole) return args

  for (const alias of TRADE_TITLE_ALIASES) {
    if (alias.match.test(targetRole)) {
      return {
        ...args,
        targetRole: `${alias.title}${alias.tradeCode ? ` (${alias.tradeCode})` : ''}`,
        tradeCode: args.tradeCode ?? alias.tradeCode ?? null,
      }
    }
  }

  return args
}

function similarity(left: string, right: string) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return 0
  if (a === b) return 1

  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  let overlap = 0
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1
  })

  return overlap / Math.max(aTokens.size, bTokens.size, 1)
}

function extractProvinceCode(region: string | null | undefined) {
  const normalized = ` ${normalizeText(region)} `
  for (const candidate of REGION_ALIASES) {
    if (candidate.patterns.some((pattern) => normalized.includes(pattern))) {
      return candidate.code
    }
  }
  return null
}

function inferTradeFamily(profile: CareerPathwayProfile): TradeFamily | null {
  if (profile.meta.pathway_type !== 'trade_apprenticeship') return null

  const tradeCode = normalizeText(profile.meta.codes.trade_code)
  const title = normalizeText(profile.meta.title)

  if (/(309a|306a|403a|313a)/.test(tradeCode) || /(electric|plumb|carpent|refrigeration|air conditioning|hvac)/.test(title)) {
    return 'construction'
  }

  if (/(442a|433a)/.test(tradeCode) || /(industrial|millwright|machin|welder|tool and die|boiler|instrument)/.test(title)) {
    return 'industrial'
  }

  if (/(434a)/.test(tradeCode) || /(powerline|utility|infrastructure|elevator)/.test(title)) {
    return 'utility'
  }

  if (/(310|421a|truck|automotive|heavy equipment|agricultural equipment|motorcycle|auto body|small engine)/.test(tradeCode) || /(automotive|truck|heavy equipment|motorcycle|auto body|small engine)/.test(title)) {
    return 'motive_power'
  }

  return 'service'
}

function applyStarterCertBundle(profile: CareerPathwayProfile): CareerPathwayProfile {
  const family = inferTradeFamily(profile)
  if (!family) return profile

  const existingBundle = Array.isArray(profile.requirements.starter_cert_bundle)
    ? profile.requirements.starter_cert_bundle
    : []
  if (existingBundle.length >= 3) return profile

  const bundle = TRADE_FAMILY_STARTER_CERT_BUNDLES[family]
  const seen = new Set(existingBundle.map((item) => normalizeText(item.name)))
  const mergedBundle = [
    ...existingBundle,
    ...bundle.filter((item) => !seen.has(normalizeText(item.name)))
  ]

  return CareerPathwayProfileSchema.parse({
    ...profile,
    requirements: {
      ...profile.requirements,
      starter_cert_bundle: mergedBundle
    }
  })
}

function scoreRoleMatch(row: CareerRoleRow, args: LookupArgs) {
  let score = 0
  if (args.occupationId && row.occupation_id === args.occupationId) score += 100
  if (args.tradeCode && row.trade_code && normalizeText(row.trade_code) === normalizeText(args.tradeCode)) {
    score += 90
  }
  if (
    args.nocCode &&
    row.noc_2021_code &&
    normalizeText(row.noc_2021_code) === normalizeText(args.nocCode)
  ) {
    score += 80
  }
  if (
    args.onetSocCode &&
    row.onet_soc_code &&
    normalizeText(row.onet_soc_code) === normalizeText(args.onetSocCode)
  ) {
    score += 70
  }

  const titleSimilarity = Math.max(
    similarity(args.targetRole ?? '', row.title),
    similarity(args.targetRole ?? '', row.slug)
  )
  score += Math.round(titleSimilarity * 50)

  if (args.region) {
    const normalizedRegion = normalizeText(args.region)
    if (
      normalizeText(row.jurisdiction_country) === normalizedRegion ||
      normalizeText(row.jurisdiction_region) === normalizedRegion
    ) {
      score += 10
    }
  }

  return score
}

function matchBuiltInProfile(args: LookupArgs) {
  const target = normalizeText(args.targetRole)
  const region = normalizeText(args.region)
  const requestedProvince = extractProvinceCode(args.region)
  const tradeCode = normalizeText(args.tradeCode)
  const nocCode = normalizeText(args.nocCode)
  const onet = normalizeText(args.onetSocCode)

  const ranked = BUILT_IN_CAREER_PATHWAY_PROFILES.map((profile) => {
    if (
      requestedProvince &&
      normalizeText(profile.meta.jurisdiction.region) !== normalizeText(requestedProvince)
    ) {
      return { profile, score: 0 }
    }

    let score = 0
    let matchedByCode = false

    if (
      tradeCode &&
      normalizeText(profile.meta.codes.trade_code) === tradeCode
    ) {
      score += 100
      matchedByCode = true
    }

    if (
      nocCode &&
      normalizeText(profile.meta.codes.noc_2021) === nocCode
    ) {
      score += 90
      matchedByCode = true
    }

    if (
      onet &&
      normalizeText(profile.meta.codes.onet_soc) === onet
    ) {
      score += 70
      matchedByCode = true
    }

    const titleSimilarity = Math.max(
      similarity(target, profile.meta.title),
      similarity(target, profile.meta.slug)
    )
    if (titleSimilarity >= 0.45) {
      score += Math.round(titleSimilarity * 60)
    } else if (!matchedByCode) {
      return { profile, score: 0 }
    }

    if (
      region &&
      (region === 'ca' ||
        region === 'canada' ||
        normalizeText(profile.meta.jurisdiction.region) === region ||
        Boolean(requestedProvince && normalizeText(profile.meta.jurisdiction.region) === normalizeText(requestedProvince)))
    ) {
      score += 10
    }

    return { profile, score }
  })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  return ranked[0]?.profile ?? null
}

async function fetchProfileFromDb(args: LookupArgs): Promise<CareerPathwayProfile | null> {
  try {
    const admin = createAdminClient()
    const { data: roleRows, error: rolesError } = await admin
      .from('career_roles')
      .select(
        'id, occupation_id, slug, title, trade_code, noc_2021_code, onet_soc_code, jurisdiction_country, jurisdiction_region'
      )
      .limit(100)

    if (rolesError) return null

    const ranked = ((roleRows ?? []) as CareerRoleRow[])
      .map((row) => ({ row, score: scoreRoleMatch(row, args) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)

    const winner = ranked[0]?.row
    if (!winner) return null

    const { data: versionRow, error: versionError } = await admin
      .from('career_role_versions')
      .select('profile_json, version')
      .eq('role_id', winner.id)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError || !versionRow?.profile_json) return null

    return CareerPathwayProfileSchema.parse(versionRow.profile_json)
  } catch {
    return null
  }
}

export async function getCareerPathwayProfile(
  args: LookupArgs
): Promise<CareerPathwayProfile | null> {
  const lookupArgs = applyTradeAlias(args)
  const databaseProfile = await fetchProfileFromDb(lookupArgs)
  if (databaseProfile) return applyStarterCertBundle(databaseProfile)
  const builtInProfile = matchBuiltInProfile(lookupArgs)
  return builtInProfile ? applyStarterCertBundle(builtInProfile) : null
}
