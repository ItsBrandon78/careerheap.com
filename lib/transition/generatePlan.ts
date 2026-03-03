import { extractProfileSignals, isPersonalIdentifier } from '@/lib/planner/profileSignals'
import { selectPlanTemplate } from '@/lib/transition/selectTemplate'
import {
  compressSimilarBullets as sharedCompressSimilarBullets,
  dedupeBullets as sharedDedupeBullets,
  normalizeBulletKey as sharedNormalizeBulletKey
} from '@/lib/transition/dedupe'
import { buildCredentialedRoleTemplate } from '@/lib/transition/templates/credentialedRole'
import { buildExperienceLadderRoleTemplate } from '@/lib/transition/templates/experienceLadderRole'
import { buildGeneralRoleTemplate } from '@/lib/transition/templates/generalRole'
import { buildPortfolioRoleTemplate } from '@/lib/transition/templates/portfolioRole'
import { roleLabel } from '@/lib/transition/templates/common'
import { buildRegulatedProfessionTemplate } from '@/lib/transition/templates/regulatedProfession'
import { buildRegulatedTradeTemplate } from '@/lib/transition/templates/regulatedTrade'
import type {
  DerivedSignal,
  DerivedSignals,
  OccupationResolutionSummary,
  OccupationTemplateProfile,
  PlannerReportSource,
  PlanTemplateKey,
  TemplateOutput,
  TransitionModeReport,
  TransitionPlanContext,
  TransitionRelationship
} from '@/lib/transition/types'
import { TransitionModeSchema } from '@/lib/transition/types'

export type GenerateTransitionPlanInput = {
  currentRole: string
  targetRole: string
  experienceText?: string
  location?: string
  education?: string
  incomeTarget?: string
  report: PlannerReportSource
  currentResolution?: OccupationResolutionSummary | null
  targetResolution?: OccupationResolutionSummary | null
}

type RequirementDescriptor = {
  label: string
  weight: number
  action: string
}

type SignalRule = {
  key: string
  label: string
  sourcePatterns: RegExp[]
  targetPatterns: RegExp[]
  overlapText: string
  missingAction: string
}

type ActionableGapType = 'credential' | 'knowledge' | 'tools' | 'proof' | 'channel'

type ActionableGap = {
  type: ActionableGapType
  title: string
  howToFix: string[]
}

const EDUCATION_RANK: Record<string, number> = {
  'no formal degree': 0,
  'high school': 1,
  apprenticeship: 2,
  'trade certification': 2,
  "associate's": 3,
  'associate degree': 3,
  "bachelor's": 4,
  'bachelor degree': 4,
  "master's": 5,
  'master degree': 5,
  doctorate: 6
}

const TEMPLATE_ASSUMPTIONS: Record<PlanTemplateKey, string[]> = {
  regulated_trade: [
    'You start direct employer and pathway outreach in week 1.',
    'You follow the training sequence in the right order instead of applying blindly.',
    'You keep weekly output consistent while the first sponsor or entry point is still forming.'
  ],
  regulated_profession: [
    'You verify education and licensure steps before spending money.',
    'You move one admissions, exam, or paperwork task forward every week.',
    'You keep a realistic timeline for supervised practice and first employable milestones.'
  ],
  credentialed_role: [
    'You keep one focused learning path moving every week.',
    'You pair learning with visible practice, not study alone.',
    'You start targeted outreach as soon as the first proof is usable.'
  ],
  portfolio_role: [
    'You ship small work samples quickly instead of waiting for one perfect project.',
    'You ask for feedback early and use it to tighten the next sample.',
    'You apply only where your current portfolio actually fits.'
  ],
  experience_ladder_role: [
    'You lead with measurable results, not just title history.',
    'You treat referrals and positioning as part of the plan, not extras.',
    'You tighten your stories based on response quality each week.'
  ],
  general_role: [
    'You focus on the highest-overlap openings first.',
    'You turn the top missing requirement into simple visible proof quickly.',
    'You keep applications, follow-ups, and outreach measured every week.'
  ]
}

const TEMPLATE_DEFAULT_REQUIREMENTS: Record<PlanTemplateKey, RequirementDescriptor[]> = {
  regulated_trade: [
    { label: 'Safety and compliance basics', weight: 1, action: 'Confirm the first safety and entry requirements in your area.' },
    { label: 'Hands-on tool familiarity', weight: 0.92, action: 'Get hands-on with the core tools or materials used in the trade.' },
    { label: 'Registration or sponsor process', weight: 0.96, action: 'Map the sponsor, registration, or intake step before you apply widely.' },
    { label: 'Supervised hours and technical schooling', weight: 0.88, action: 'Understand how supervised hours and classroom training are tracked.' }
  ],
  regulated_profession: [
    { label: 'Education prerequisites', weight: 1, action: 'Confirm the exact education baseline and missing prerequisites.' },
    { label: 'Licensing or board registration', weight: 1, action: 'Map the licensing or board process before you commit to a route.' },
    { label: 'Supervised practice path', weight: 0.9, action: 'Identify the supervised practice, placement, or residency path tied to this field.' }
  ],
  credentialed_role: [
    { label: 'A recognized credential', weight: 0.96, action: 'Choose one respected certification or learning path and start it now.' },
    { label: 'Hands-on practice', weight: 0.88, action: 'Turn the top target skill into a repeatable weekly practice block.' },
    { label: 'Proof of applied skill', weight: 0.86, action: 'Create one example that shows you can use the skill in context.' }
  ],
  portfolio_role: [
    { label: 'Portfolio-ready work samples', weight: 0.98, action: 'Create one focused work sample that mirrors the real job.' },
    { label: 'Clear case studies', weight: 0.88, action: 'Write simple case notes that explain the problem, choices, and result.' },
    { label: 'Targeted feedback', weight: 0.82, action: 'Ask practitioners for feedback on your strongest sample this week.' }
  ],
  experience_ladder_role: [
    { label: 'Quantified outcomes', weight: 0.96, action: 'Document measurable wins that already match the next level.' },
    { label: 'Leadership or ownership examples', weight: 0.9, action: 'Prepare 2 short stories that show ownership, coordination, or decision-making.' },
    { label: 'Next-level scope fit', weight: 0.86, action: 'Focus on roles where your current scope already overlaps meaningfully.' }
  ],
  general_role: [
    { label: 'Role-specific evidence', weight: 0.92, action: 'Build one clear example that proves the top target requirement.' },
    { label: 'Targeted outreach', weight: 0.84, action: 'Reach out directly instead of relying on job boards alone.' },
    { label: 'Resume and interview fit', weight: 0.82, action: 'Rewrite your positioning so it sounds like the target role, not your current one.' }
  ]
}

const SIGNAL_RULES: SignalRule[] = [
  {
    key: 'safety',
    label: 'Safety and compliance discipline',
    sourcePatterns: [/\bsafety\b/, /\bosha\b/, /\bwhmis\b/, /\bworking at heights\b/, /\bfirst aid\b/, /\bprotocol\b/],
    targetPatterns: [/\bsafety\b/, /\bcompliance\b/, /\blicens/, /\bregulat/, /\biso\b/, /\bquality\b/],
    overlapText: 'You already show safety and rule-following habits, which helps you earn trust faster.',
    missingAction: 'Close the safety or compliance gap early so employers do not block you on basics.'
  },
  {
    key: 'process',
    label: 'Process discipline',
    sourcePatterns: [/\bsop\b/, /\bprocedure\b/, /\bchecklist\b/, /\bworkflow\b/, /\bstandard\b/, /\bdocumentation\b/],
    targetPatterns: [/\bprocess\b/, /\bworkflow\b/, /\bprocedure\b/, /\bdocument/, /\bpolicy\b/],
    overlapText: 'You already work inside repeatable processes, which lowers the learning curve.',
    missingAction: 'Show that you can follow the target workflow with one concrete example.'
  },
  {
    key: 'stamina',
    label: 'Physical stamina and reliability',
    sourcePatterns: [/\bwarehouse\b/, /\bkitchen\b/, /\bchef\b/, /\bcook\b/, /\blift\b/, /\bstand\b/, /\bmanual\b/, /\bshift\b/, /\bovernight\b/],
    targetPatterns: [/\bphysical\b/, /\blabor\b/, /\bmaterial\b/, /\bon site\b/, /\bfield\b/],
    overlapText: 'You already handle physical work and long shifts, which is real leverage here.',
    missingAction: 'Be ready to explain how your pace, attendance, and physical reliability carry over.'
  },
  {
    key: 'teamwork',
    label: 'Team coordination',
    sourcePatterns: [/\bteam\b/, /\bcrew\b/, /\bcollaborat/, /\bservice\b/, /\bclassroom\b/],
    targetPatterns: [/\bteam\b/, /\bcross functional\b/, /\bcoordina/, /\bpartner\b/],
    overlapText: 'You already have teamwork reps that transfer into the new environment.',
    missingAction: 'Prepare one example that shows you can coordinate cleanly with others under pressure.'
  },
  {
    key: 'leadership',
    label: 'Leadership and ownership',
    sourcePatterns: [/\blead\b/, /\bmanage\b/, /\bsupervis/, /\bmentor\b/, /\btrain\b/, /\bhead chef\b/],
    targetPatterns: [/\blead\b/, /\bmanage\b/, /\bowner\b/, /\bsupervis/, /\bcoach\b/],
    overlapText: 'You already have leadership or ownership signals that can support a faster move.',
    missingAction: 'Tighten 2 examples that show leadership, ownership, or decision-making.'
  },
  {
    key: 'communication',
    label: 'Clear communication',
    sourcePatterns: [/\bcustomer\b/, /\bclient\b/, /\bservice\b/, /\bteach/, /\bpresent/, /\bphone\b/, /\bemail\b/],
    targetPatterns: [/\bcommunic/, /\bstakeholder\b/, /\bclient\b/, /\binterview\b/, /\bcollaborat/],
    overlapText: 'You already communicate clearly with customers, clients, or teams, which matters in the transition.',
    missingAction: 'Turn communication into proof with one sharp outreach message and one interview story.'
  },
  {
    key: 'documentation',
    label: 'Documentation and detail control',
    sourcePatterns: [/\badmin\b/, /\bdocument/, /\breport/, /\bdata entry\b/, /\bnotes\b/, /\brecord\b/, /\bpaperwork\b/],
    targetPatterns: [/\bdocument/, /\brecord/, /\bdetail\b/, /\baccuracy\b/, /\bcompliance\b/],
    overlapText: 'You already have detail and documentation habits, which reduces ramp time.',
    missingAction: 'Show one example where your detail control prevented errors or kept work moving.'
  },
  {
    key: 'scheduling',
    label: 'Scheduling and coordination',
    sourcePatterns: [/\bschedul/, /\bcalendar\b/, /\bdispatch\b/, /\bcoordinat/, /\bplan\b/],
    targetPatterns: [/\bschedul/, /\bcoordinat/, /\boperations\b/, /\bworkflow\b/],
    overlapText: 'You already coordinate moving pieces, which translates into many structured roles.',
    missingAction: 'Use one concrete scheduling or coordination example to show readiness.'
  },
  {
    key: 'analysis',
    label: 'Analytical thinking',
    sourcePatterns: [/\banalys/, /\bexcel\b/, /\bsql\b/, /\bdata\b/, /\bresearch\b/, /\bmetrics\b/],
    targetPatterns: [/\banalys/, /\bdata\b/, /\bmodel\b/, /\binsight\b/, /\bforecast\b/, /\breporting\b/],
    overlapText: 'You already use data or structured analysis, which gives you a real head start.',
    missingAction: 'Add one project, case, or example that shows analysis in the target context.'
  },
  {
    key: 'technical',
    label: 'Technical tooling',
    sourcePatterns: [/\bsoftware\b/, /\bdeveloper\b/, /\bengineering\b/, /\btool\b/, /\bplatform\b/, /\bsystem\b/],
    targetPatterns: [/\bsoftware\b/, /\btool\b/, /\bplatform\b/, /\btechnical\b/, /\bautomation\b/, /\bcode\b/],
    overlapText: 'You already work around tools or systems, which makes the technical ramp cleaner.',
    missingAction: 'Get hands-on with the top tools early and capture proof you can talk through.'
  },
  {
    key: 'troubleshooting',
    label: 'Troubleshooting',
    sourcePatterns: [/\btroubleshoot/, /\bdebug\b/, /\bresolve\b/, /\bproblem solving\b/, /\brepair\b/],
    targetPatterns: [/\btroubleshoot/, /\bdiagnos/, /\bdebug\b/, /\bproblem\b/, /\bresolve\b/],
    overlapText: 'You already solve problems in real time, which is valuable in the target role.',
    missingAction: 'Prepare one example that shows how you diagnosed and solved a problem step by step.'
  },
  {
    key: 'portfolio',
    label: 'Portfolio-quality proof',
    sourcePatterns: [/\bportfolio\b/, /\bcase stud/, /\bgithub\b/, /\bdesign\b/, /\bprototype\b/, /\bproject\b/],
    targetPatterns: [/\bportfolio\b/, /\bcase stud/, /\bux\b/, /\bdesign\b/, /\bwork sample\b/, /\bgithub\b/],
    overlapText: 'You already have some proof-building habits, which helps in portfolio-driven moves.',
    missingAction: 'Create focused work samples and simple case notes before expecting strong response rates.'
  },
  {
    key: 'credential',
    label: 'Credential readiness',
    sourcePatterns: [/\bcertif/, /\blicens/, /\btraining\b/, /\bcourse\b/, /\bdegree\b/, /\bapprentice/],
    targetPatterns: [/\bcertif/, /\blicens/, /\bregistration\b/, /\bdegree\b/, /\bexam\b/, /\bboard\b/],
    overlapText: 'You already have experience completing formal training steps, which helps on gated paths.',
    missingAction: 'Treat the next credential, registration, or exam step as a named project with a deadline.'
  },
  {
    key: 'care',
    label: 'People support and direct care',
    sourcePatterns: [/\bteacher\b/, /\bclassroom\b/, /\bcoach\b/, /\bcare\b/, /\bpatient\b/, /\bstudent\b/],
    targetPatterns: [/\bpatient\b/, /\bcare\b/, /\bclinical\b/, /\bnurs/, /\bservice\b/],
    overlapText: 'You already have people-facing care or support experience that can transfer.',
    missingAction: 'Show one example of calm, organized support under pressure.'
  },
  {
    key: 'sales',
    label: 'Persuasion and customer insight',
    sourcePatterns: [/\bretail\b/, /\bsales\b/, /\bupsell\b/, /\bcustomer\b/, /\bmerchand/],
    targetPatterns: [/\buser\b/, /\bcustomer\b/, /\bclient\b/, /\bresearch\b/, /\bstakeholder\b/],
    overlapText: 'You already understand customer behavior, which can transfer into user or client-facing work.',
    missingAction: 'Translate customer-facing experience into clearer user, client, or stakeholder language.'
  },
  {
    key: 'math',
    label: 'Measurement and practical math',
    sourcePatterns: [/\bmeasure\b/, /\binventory\b/, /\bcounts?\b/, /\bprep\b/, /\bbudget\b/],
    targetPatterns: [/\bmath\b/, /\bmeasure\b/, /\bblueprint\b/, /\bschematic\b/, /\bcalculation\b/],
    overlapText: 'You already work with measurements or counts, which helps on technical tasks.',
    missingAction: 'Refresh the basic calculations or measurement habits the target role expects.'
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeBulletKey(value: string) {
  return sharedNormalizeBulletKey(value)
}

function tokenize(value: string) {
  return normalizeText(value).split(' ').filter(Boolean)
}

function formatLabel(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function toSentence(value: string) {
  const formatted = formatLabel(value)
  if (!formatted) return ''
  return /[.!?]$/.test(formatted) ? formatted : `${formatted}.`
}

function cleanPublicFacingBullet(value: string) {
  const normalized = value
    .replace(/^learn the basics of (confirm|list|verify|compare|start|speak with)\b/i, (_, verb: string) => {
      const cleanedVerb = verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase()
      return cleanedVerb
    })
    .replace(/^start the first formal step for (confirm|verify)\b/i, (_, verb: string) => {
      const cleanedVerb = verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase()
      return cleanedVerb
    })
    .trim()
  const formatted = toSentence(normalized)
  if (!formatted || isPersonalIdentifier(formatted)) return ''
  return formatted
}

function shouldGeneralizeRequirementLabel(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return true
  const commaCount = (normalized.match(/,/g) ?? []).length
  return (
    normalized.includes('...') ||
    normalized.length > 88 ||
    commaCount >= 2 ||
    (/^(install|maintain|perform|operate|use|manage|support|coordinate|verify|document)\b/i.test(normalized) &&
      normalized.length > 48)
  )
}

function fallbackGapTitle(
  type: ActionableGapType,
  tradeMode: boolean,
  templateKey: PlanTemplateKey
) {
  if (type === 'credential') {
    return tradeMode ? 'Pathway and registration steps' : 'Required credential steps'
  }
  if (type === 'tools') {
    return tradeMode ? 'Core tools and materials' : 'Core tools and systems'
  }
  if (type === 'channel') {
    return 'Better hiring channel mix'
  }
  if (type === 'proof') {
    return tradeMode ? 'Proof of hands-on readiness' : 'Proof of role-ready work'
  }
  if (tradeMode) {
    return 'Core job fundamentals'
  }
  return templateKey === 'portfolio_role' ? 'Portfolio-ready fundamentals' : 'Role-specific fundamentals'
}

function isTradeProfile(targetProfile: OccupationTemplateProfile, templateKey: PlanTemplateKey) {
  const title = normalizeText(`${targetProfile.title} ${targetProfile.code}`)
  return (
    templateKey === 'regulated_trade' ||
    /\b(electric|plumb|hvac|mechanic|carpenter|welder|millwright|pipefitter|refrigeration|sheet metal)\b/.test(
      title
    )
  )
}

function classifyGapType(label: string, templateKey: PlanTemplateKey) {
  const normalized = normalizeText(label)
  if (
    /\b(certif|license|licen[sc]e|registration|apprentice|sponsor|board|exam|permit|clearance|red seal|coq)\b/.test(
      normalized
    )
  ) {
    return 'credential' as const
  }
  if (/\b(tool|equipment|multimeter|drill|ladder|platform|software|system)\b/.test(normalized)) {
    return 'tools' as const
  }
  if (/\b(year|experience|portfolio|proof|sample|project|demo)\b/.test(normalized)) {
    return 'proof' as const
  }
  if (
    /\b(outreach|application|referral|recruiter|union|contractor|manager|network|channel)\b/.test(
      normalized
    )
  ) {
    return 'channel' as const
  }
  if (templateKey === 'regulated_trade' && /\b(cross functional|stakeholder)\b/.test(normalized)) {
    return 'proof' as const
  }
  return 'knowledge' as const
}

function buildActionableGap(
  descriptor: RequirementDescriptor,
  templateKey: PlanTemplateKey,
  targetProfile: OccupationTemplateProfile
) {
  const normalizedLabel = normalizeText(descriptor.label)
  if (
    templateKey !== 'experience_ladder_role' &&
    /\b(cross functional|cross-functional)\b/.test(normalizedLabel)
  ) {
    return {
      type: 'proof',
      title: 'Clean handoff and team coordination proof',
      howToFix: [
        'Shadow one site or workflow handoff and note what good coordination looks like.',
        'Prepare one short example showing how you kept work moving with another team.'
      ]
    } satisfies ActionableGap
  }

  if (/\b\d+\+?\s*(year|yr)s?\b/.test(normalizedLabel)) {
    return {
      type: 'proof',
      title: 'Proof of hands-on readiness',
      howToFix: [
        'Create 1 small, job-relevant proof example this week.',
        'Get 1 reference or shadow day that shows you can work safely and reliably.'
      ]
    } satisfies ActionableGap
  }

  const type = classifyGapType(descriptor.label, templateKey)
  const tradeMode = isTradeProfile(targetProfile, templateKey)
  const useGenericLabel = shouldGeneralizeRequirementLabel(descriptor.label)
  const displayLabel =
    (useGenericLabel ? fallbackGapTitle(type, tradeMode, templateKey) : formatLabel(descriptor.label)) ||
    fallbackGapTitle(type, tradeMode, templateKey)

  if (tradeMode) {
    if (/\b(theory|circuit|ohm|voltage|current|resistance)\b/.test(normalizedLabel)) {
      return {
        type: 'knowledge',
        title: 'Electrical theory basics',
        howToFix: [
          'Learn circuits, voltage, current, and resistance for 2 weeks at 30 min/day.',
          'Explain the basics back in plain language after each study session.'
        ]
      } satisfies ActionableGap
    }
    if (/\b(safety|lockout|isolation|test before touch|compliance)\b/.test(normalizedLabel)) {
      return {
        type: 'knowledge',
        title: 'Safety isolation habits',
        howToFix: [
          'Learn the test-before-touch habit before you do any hands-on demo work.',
          'Use only safe demo-board or classroom-style practice, not live work.'
        ]
      } satisfies ActionableGap
    }
    if (/\b(tool|multimeter|hand tool|strippers|drill|ladder)\b/.test(normalizedLabel)) {
      return {
        type: 'tools',
        title: 'Tools familiarity',
        howToFix: [
          'Handle a multimeter, basic hand tools, drills, and ladders in safe demo practice.',
          'Label what each tool is for and when you would use it.'
        ]
      } satisfies ActionableGap
    }
    if (/\b(blueprint|schematic|measurement|layout)\b/.test(normalizedLabel)) {
      return {
        type: 'knowledge',
        title: 'Blueprints and measurement',
        howToFix: [
          'Practice reading 1 simple schematic or layout each week.',
          'Refresh tape-measure and basic calculation habits alongside that practice.'
        ]
      } satisfies ActionableGap
    }
    if (/\b(wiring|fixture|switch|outlet|conduit|cable|panel|receptacle)\b/.test(normalizedLabel)) {
      return {
        type: 'knowledge',
        title: 'Core installation workflow',
        howToFix: [
          'Practice basic install flow for outlets, switches, fixtures, and wire runs using safe demo setups only.',
          'Write down the order of operations so you can explain the workflow clearly.'
        ]
      } satisfies ActionableGap
    }
    if (/\b(apprentice|sponsor|registration|hours|school|schooling|union|intake)\b/.test(normalizedLabel)) {
      return {
        type: 'credential',
        title: 'Pathway step: sponsor and apprenticeship intake',
        howToFix: [
          'List the first sponsor, intake, or apprenticeship registration step in your area.',
          targetProfile.region === 'CA'
            ? 'Confirm how hours, technical training, and licensing are tracked in your province.'
            : 'Confirm how employer sponsorship, supervised hours, and schooling are tracked in your area.'
        ]
      } satisfies ActionableGap
    }
  }

  if (type === 'credential') {
    return {
      type,
      title: displayLabel,
      howToFix: [
        useGenericLabel
          ? 'Start the first formal step for this pathway requirement.'
          : `Start the first formal step for ${displayLabel.toLowerCase()}.`,
        'Confirm the exact local requirement before you spend money.'
      ]
    } satisfies ActionableGap
  }

  if (type === 'tools') {
    return {
      type,
      title: displayLabel,
      howToFix: [
        useGenericLabel
          ? 'Get one hands-on practice rep with the core tools or materials used in this field.'
          : `Get one hands-on practice rep with ${displayLabel.toLowerCase()}.`,
        'Capture a short note or example you can use in applications.'
      ]
    } satisfies ActionableGap
  }

  if (type === 'channel') {
    return {
      type,
      title: displayLabel,
      howToFix: [
        'Use the hiring channel that actually creates replies in this field.',
        'Set a weekly outreach target and track who responds.'
      ]
    } satisfies ActionableGap
  }

  if (type === 'proof') {
    return {
      type,
      title: displayLabel,
      howToFix: [
        useGenericLabel
          ? 'Build 1 concrete example that proves you can handle a core task in this field.'
          : `Build 1 concrete example that proves ${displayLabel.toLowerCase()}.`,
        'Keep it small, visible, and easy to explain.'
      ]
    } satisfies ActionableGap
  }

  return {
    type,
    title: displayLabel,
    howToFix: [
      useGenericLabel
        ? tradeMode
          ? 'Learn the core job fundamentals in short daily blocks.'
          : 'Learn the core role fundamentals in short daily blocks.'
        : `Learn the basics of ${displayLabel.toLowerCase()} in short daily blocks.`,
      'Turn the learning into one simple proof this month.'
    ]
  } satisfies ActionableGap
}

function formatActionableGap(gap: ActionableGap) {
  const primaryFix = gap.howToFix[0] ?? ''
  if (!primaryFix) return cleanPublicFacingBullet(gap.title)
  return cleanPublicFacingBullet(primaryFix)
}

function parseTimelineRange(value: string) {
  const numbers = [...value.matchAll(/(\d+)/g)].map((match) => Number.parseInt(match[1], 10))
  if (numbers.length === 0) return null
  if (numbers.length === 1) {
    const exact = clamp(numbers[0], 1, 48)
    return { min: exact, max: exact }
  }
  const min = clamp(Math.min(...numbers), 1, 48)
  const max = clamp(Math.max(...numbers), min, 48)
  return { min, max }
}

function normalizeHourlyValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null
  return Number((value > 250 ? value / 2080 : value).toFixed(1))
}

export function dedupeBullets(values: string[], max = 4) {
  return sharedDedupeBullets(values, max, toSentence)
}

export function compressSimilarBullets(values: string[], max = 4) {
  return sharedCompressSimilarBullets(values, max, toSentence)
}

function inferEducationRank(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) return 0
  let best = 0
  for (const [label, rank] of Object.entries(EDUCATION_RANK)) {
    if (normalized.includes(label)) {
      best = Math.max(best, rank)
    }
  }
  return best
}

function sameMeaningfulRoleInputs(left: string, right: string) {
  const leftTokens = tokenize(left).filter((token) => !['a', 'an', 'the', 'and', 'of', 'to'].includes(token))
  const rightTokens = tokenize(right).filter((token) => !['a', 'an', 'the', 'and', 'of', 'to'].includes(token))
  return leftTokens.join(' ') === rightTokens.join(' ')
}

function determineRelationship(
  currentRole: string,
  targetRole: string,
  currentResolution: OccupationResolutionSummary | null,
  targetResolution: OccupationResolutionSummary | null
): TransitionRelationship {
  if (
    currentResolution &&
    targetResolution &&
    currentResolution.code &&
    currentResolution.code === targetResolution.code &&
    !sameMeaningfulRoleInputs(currentResolution.rawInputTitle, targetResolution.rawInputTitle)
  ) {
    return 'within_career_progression'
  }

  if (
    currentRole &&
    targetRole &&
    sameMeaningfulRoleInputs(currentRole, targetRole)
  ) {
    return 'within_career_progression'
  }

  return 'career_switch'
}

function buildOccupationProfile(
  input: GenerateTransitionPlanInput,
  relationship: TransitionRelationship
): OccupationTemplateProfile {
  const targetResolution = input.targetResolution ?? null
  const requirements = input.report.targetRequirements
  const suggested = input.report.suggestedCareers[0] ?? null
  const curatedProfile = input.report.careerPathwayProfile ?? null
  const curatedEducation =
    curatedProfile?.requirements.must_have.find((item) =>
      /\beducation|degree|diploma|school|math\b/i.test(item.type)
    )?.name ?? ''
  const curatedCertifications = [
    ...(curatedProfile?.requirements.must_have
      .filter((item) => /\b(cert|license|licen[cs]e|exam|training|legal|health_safety)\b/i.test(item.type))
      .map((item) => item.name) ?? []),
    ...(curatedProfile?.requirements.nice_to_have
      .filter((item) => /\b(cert|license|licen[cs]e|training|health_safety)\b/i.test(item.type))
      .map((item) => item.name) ?? [])
  ]
  const curatedHardGates = curatedProfile?.requirements.must_have.map((item) => item.name) ?? []
  const curatedEmployerSignals = [
    ...(curatedProfile?.skills.core ?? []),
    ...(curatedProfile?.skills.tools_tech ?? []),
    ...(curatedProfile?.skills.soft_skills ?? [])
  ]
  const displayTitle =
    targetResolution?.rawInputTitle ||
    curatedProfile?.meta.title ||
    targetResolution?.title ||
    suggested?.title ||
    input.report.transitionReport?.marketSnapshot.role ||
    input.targetRole ||
    'Target role'
  const regulatedTitleSignal = normalizeText(
    [
      displayTitle,
      targetResolution?.title ?? '',
      ...(requirements?.certifications ?? []),
      ...(requirements?.hardGates ?? [])
    ].join(' ')
  )
  const inferredRegulated =
    Boolean(curatedProfile?.meta.regulated || requirements?.regulated || suggested?.regulated) ||
    /\b(orthodont|dentist|anesthesi|psychiat|surgeon|cardiolog|physician|doctor|pharmac|nurs|therap|midwife|clinical)\b/.test(
      regulatedTitleSignal
    ) ||
    Boolean(requirements?.examRequired)

  return {
    title: displayTitle,
    code:
      targetResolution?.code ||
      curatedProfile?.meta.codes.trade_code ||
      curatedProfile?.meta.codes.noc_2021 ||
      suggested?.occupationId ||
      input.targetRole ||
      'target-role',
    regulated: inferredRegulated,
    education: curatedEducation || requirements?.education || '',
    certifications: dedupeBullets([...(requirements?.certifications ?? []), ...curatedCertifications], 8),
    hardGates: dedupeBullets([...(requirements?.hardGates ?? []), ...curatedHardGates], 8),
    employerSignals: dedupeBullets(
      [...(requirements?.employerSignals ?? []), ...curatedEmployerSignals],
      8
    ),
    apprenticeshipHours: requirements?.apprenticeshipHours ?? null,
    examRequired: requirements?.examRequired ?? null,
    stage: targetResolution?.stage ?? null,
    region:
      targetResolution?.region ??
      (curatedProfile?.meta.jurisdiction.country === 'CA'
        ? 'CA'
        : curatedProfile?.meta.jurisdiction.country === 'US'
          ? 'US'
          : null),
    relationship
  }
}

function mapRequirementToSignalRule(value: string) {
  const normalized = normalizeText(value)
  return (
    SIGNAL_RULES.find((rule) =>
      rule.targetPatterns.some((pattern) => pattern.test(normalized))
    ) ?? null
  )
}

function addRequirementDescriptor(
  target: Map<string, RequirementDescriptor>,
  descriptor: RequirementDescriptor
) {
  const key = normalizeBulletKey(descriptor.label)
  if (!key) return

  const existing = target.get(key)
  if (!existing || descriptor.weight > existing.weight) {
    target.set(key, descriptor)
  }
}

function buildRequirementDescriptors(
  report: PlannerReportSource,
  templateKey: PlanTemplateKey
) {
  const descriptors = new Map<string, RequirementDescriptor>()

  for (const certification of report.targetRequirements?.certifications ?? []) {
    addRequirementDescriptor(descriptors, {
      label: certification,
      weight: 1,
      action: `Start or schedule ${formatLabel(certification)} if it shows up repeatedly in the target path.`
    })
  }

  for (const gate of report.targetRequirements?.hardGates ?? []) {
    addRequirementDescriptor(descriptors, {
      label: gate,
      weight: 0.98,
      action: `Confirm the exact requirement for ${formatLabel(gate)} before you spend time on low-value applications.`
    })
  }

  for (const item of report.targetRequirements?.employerSignals ?? []) {
    addRequirementDescriptor(descriptors, {
      label: item,
      weight: 0.86,
      action: `Build one example that proves ${normalizeText(item) || 'this requirement'} in a realistic setting.`
    })
  }

  for (const item of report.transitionSections?.mandatoryGateRequirements ?? []) {
    addRequirementDescriptor(descriptors, {
      label: item.label,
      weight: item.gapLevel === 'missing' ? 0.97 : 0.88,
      action: `Close ${normalizeText(item.label) || 'this gate'} with the exact step employers or regulators expect.`
    })
  }

  for (const item of report.transitionSections?.coreHardSkills ?? []) {
    addRequirementDescriptor(descriptors, {
      label: item.label,
      weight: item.gapLevel === 'missing' ? 0.9 : 0.8,
      action: `Practice ${normalizeText(item.label) || 'this skill'} in a focused weekly block until you can explain it clearly.`
    })
  }

  for (const item of report.transitionSections?.toolsPlatforms ?? []) {
    addRequirementDescriptor(descriptors, {
      label: item.label,
      weight: item.gapLevel === 'missing' ? 0.88 : 0.78,
      action: `Get hands-on with ${normalizeText(item.label) || 'the core tools'} and capture one example you can talk through.`
    })
  }

  for (const item of report.transitionSections?.experienceSignals ?? []) {
    addRequirementDescriptor(descriptors, {
      label: item.label,
      weight: item.gapLevel === 'missing' ? 0.84 : 0.74,
      action: `Create one story or work example that proves ${normalizeText(item.label) || 'this requirement'}.`
    })
  }

  if (descriptors.size === 0) {
    for (const fallback of TEMPLATE_DEFAULT_REQUIREMENTS[templateKey]) {
      addRequirementDescriptor(descriptors, fallback)
    }
  }

  return [...descriptors.values()]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 8)
}

function collectExperienceSourceText(input: GenerateTransitionPlanInput) {
  const profile = extractProfileSignals({
    experienceText: input.experienceText ?? ''
  })

  return normalizeText(
    [
      input.currentRole,
      input.currentResolution?.rawInputTitle ?? '',
      input.currentResolution?.title ?? '',
      ...profile.skills,
      ...profile.certifications,
      ...profile.experienceSignals,
      ...(input.report.executionStrategy?.whereYouStandNow.strengths ?? []).map((item) => item.summary),
      ...(input.report.transitionSections?.transferableStrengths ?? []).map((item) => item.label),
      ...(input.report.transitionReport?.transferableStrengths ?? []).map((item) => item.strength)
    ]
      .filter((item) => !isPersonalIdentifier(item))
      .join(' ')
  )
}

function inferAvailableSignals(sourceText: string) {
  const matched = new Set<string>()
  for (const rule of SIGNAL_RULES) {
    if (rule.sourcePatterns.some((pattern) => pattern.test(sourceText))) {
      matched.add(rule.key)
    }
  }
  return matched
}

export function deriveSignals(
  input: GenerateTransitionPlanInput,
  targetProfile: OccupationTemplateProfile,
  templateKey: PlanTemplateKey
): DerivedSignals {
  const profile = extractProfileSignals({
    experienceText: input.experienceText ?? ''
  })
  const sourceText = collectExperienceSourceText(input)
  const availableSignals = inferAvailableSignals(sourceText)
  const requirements = buildRequirementDescriptors(input.report, templateKey)
  const tradeMode = isTradeProfile(targetProfile, templateKey)
  const profileSkillKeys = profile.skills.map((item) => normalizeBulletKey(item))
  const profileCertificationKeys = profile.certifications.map((item) => normalizeBulletKey(item))
  const profileExperienceKeys = profile.experienceSignals.map((item) => normalizeBulletKey(item))
  const profileEvidenceKeys = new Set([...profileSkillKeys, ...profileCertificationKeys, ...profileExperienceKeys])

  const transferableSignals: DerivedSignal[] = []
  const missingSignals: DerivedSignal[] = []

  if (tradeMode && profile.certifications.length > 0) {
    for (const certification of profile.certifications) {
      const normalized = normalizeText(certification)
      if (
        /\b(whmis|osha|csts|working at heights|first aid|cpr|driver)\b/.test(normalized)
      ) {
        transferableSignals.push({
          label: `You already have ${certification}, which helps you look more jobsite-ready from day one.`,
          weight: 0.96,
          action: `Lead with ${certification} when you talk to employers or sponsors.`
        })
      }
    }
  }

  for (const signal of profile.experienceSignals) {
    if (isPersonalIdentifier(signal)) continue
    if (!/\b(led|managed|trained|reduced|improved|handled|maintained|worked|shift|team|crew|paced?)\b/i.test(signal)) {
      continue
    }
    transferableSignals.push({
      label: `Your background already shows usable proof: ${signal}.`,
      weight: 0.72,
      action: 'Turn that into one clean resume bullet and one interview example.'
    })
  }

  for (const descriptor of requirements) {
    const rule = mapRequirementToSignalRule(descriptor.label)
    const descriptorKey = normalizeBulletKey(descriptor.label)
    const matchesDirectProfileEvidence = [...profileEvidenceKeys].some((key) => {
      if (!key || !descriptorKey) return false
      return (
        key === descriptorKey ||
        key.includes(descriptorKey) ||
        descriptorKey.includes(key)
      )
    })
    const matchesDirectCertification = profileCertificationKeys.some((key) => {
      if (!key || !descriptorKey) return false
      return key === descriptorKey || key.includes(descriptorKey) || descriptorKey.includes(key)
    })
    const matched = Boolean(
      matchesDirectProfileEvidence ||
        (rule &&
          (availableSignals.has(rule.key) ||
            rule.sourcePatterns.some((pattern) => pattern.test(sourceText))))
    )

    if (matched) {
      if (tradeMode && matchesDirectCertification) {
        continue
      }
      transferableSignals.push({
        label: rule?.overlapText || `You already have usable overlap with ${descriptor.label}.`,
        weight: descriptor.weight,
        action: descriptor.action
      })
      continue
    }

    const actionableGap = buildActionableGap(descriptor, templateKey, targetProfile)
    missingSignals.push({
      label: actionableGap.title,
      weight: descriptor.weight,
      action:
        formatActionableGap(actionableGap) ||
        (rule?.missingAction ? cleanPublicFacingBullet(rule.missingAction) : cleanPublicFacingBullet(descriptor.action))
    })
  }

  if (transferableSignals.length === 0) {
    for (const key of availableSignals) {
      const rule = SIGNAL_RULES.find((item) => item.key === key)
      if (!rule) continue
      transferableSignals.push({
        label: rule.overlapText,
        weight: 0.65,
        action: rule.missingAction
      })
    }
  }

  if (missingSignals.length === 0) {
    for (const fallback of TEMPLATE_DEFAULT_REQUIREMENTS[templateKey]) {
      const actionableGap = buildActionableGap(fallback, templateKey, targetProfile)
      missingSignals.push({
        label: actionableGap.title,
        weight: fallback.weight,
        action: formatActionableGap(actionableGap) || cleanPublicFacingBullet(fallback.action)
      })
    }
  }

  const priorityActions = compressSimilarBullets(
    [
      ...missingSignals
        .sort((left, right) => right.weight - left.weight)
        .map((item) => item.action),
      ...TEMPLATE_DEFAULT_REQUIREMENTS[templateKey].map((item) => item.action)
    ],
    4
  )

  if (
    targetProfile.relationship === 'within_career_progression' &&
    !priorityActions.some((item) => normalizeBulletKey(item).includes('measurable'))
  ) {
    priorityActions.unshift('Document 3 measurable wins that already prove next-level scope.')
  }

  return {
    transferableSignals: transferableSignals
      .filter((item) => !isPersonalIdentifier(item.label))
      .map((item) => ({
        ...item,
        label: cleanPublicFacingBullet(item.label),
        action: cleanPublicFacingBullet(item.action)
      }))
      .filter((item) => item.label && item.action)
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 4),
    missingSignals: missingSignals
      .filter((item) => !isPersonalIdentifier(item.label))
      .map((item) => ({
        ...item,
        label: cleanPublicFacingBullet(item.label),
        action: cleanPublicFacingBullet(item.action)
      }))
      .filter((item) => item.label && item.action)
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 4),
    priorityActions: priorityActions
      .map((item) => cleanPublicFacingBullet(item))
      .filter(Boolean)
      .slice(0, 4)
  }
}

function buildDifficulty(
  report: PlannerReportSource,
  targetProfile: OccupationTemplateProfile,
  templateKey: PlanTemplateKey,
  education: string,
  signals: DerivedSignals
) {
  const compatibilityScore = report.compatibilitySnapshot.score
  const hardGateCount = targetProfile.hardGates.length
  const certificationCount = targetProfile.certifications.length
  const missingSignalCount = signals.missingSignals.length
  const transferabilityCredit = Math.min(1.6, signals.transferableSignals.length * 0.28)
  const marketFriction = report.marketEvidence?.baselineOnly
    ? 1.1
    : (report.marketEvidence?.postingsCount ?? 0) < 5
      ? 0.65
      : 0.25
  const educationGap = Math.max(
    0,
    inferEducationRank(targetProfile.education) - inferEducationRank(education)
  )

  const templateBase =
    templateKey === 'regulated_profession'
      ? 4.4
      : templateKey === 'regulated_trade'
        ? 3.5
        : templateKey === 'credentialed_role'
          ? 3.1
          : templateKey === 'portfolio_role'
            ? 2.8
            : templateKey === 'experience_ladder_role'
              ? 2.2
              : 2.6

  const gatedBarrier =
    hardGateCount * 0.45 +
    certificationCount * 0.35 +
    (targetProfile.examRequired ? 0.8 : 0) +
    (targetProfile.apprenticeshipHours ? 0.8 : 0) +
    (targetProfile.regulated ? 0.55 : 0)

  const evidenceBarrier = missingSignalCount * 0.45
  const compatibilityPenalty = clamp((72 - compatibilityScore) / 18, 0, 2.6)

  const score = Number(
    clamp(
      Math.round((templateBase + gatedBarrier + educationGap * 0.7 + evidenceBarrier + marketFriction + compatibilityPenalty - transferabilityCredit) * 10) /
        10,
      1,
      9.8
    ).toFixed(1)
  )

  const label: TransitionModeReport['difficulty']['label'] =
    score >= 7.6 ? 'Very Hard' : score >= 5.9 ? 'Hard' : score >= 3.6 ? 'Moderate' : 'Easy'

  const why = compressSimilarBullets(
    [
      hardGateCount > 0 || certificationCount > 0
        ? `This target has ${hardGateCount + certificationCount} formal gate${hardGateCount + certificationCount === 1 ? '' : 's'} you need to respect early.`
        : 'There is no heavy formal gate blocking the first move.',
      educationGap > 0
        ? 'Your current education profile is lighter than the common baseline, so the pathway takes longer.'
        : 'Your current education profile does not create a major extra delay.',
      missingSignalCount > 0
        ? `${missingSignalCount} high-value requirement${missingSignalCount === 1 ? '' : 's'} still need stronger proof.`
        : 'Most of the target requirements already have at least some evidence from your background.',
      targetProfile.relationship === 'within_career_progression'
        ? 'This is closer to a progression move than a full reset, so positioning matters as much as skill-building.'
        : 'This is a real transition, so proof and channel mix matter more than intent alone.'
    ],
    3
  )

  return { score, label, why }
}

function buildTimeline(
  report: PlannerReportSource,
  targetProfile: OccupationTemplateProfile,
  templateKey: PlanTemplateKey,
  difficultyScore: number
) {
  const curatedProfile = report.careerPathwayProfile ?? null
  if (curatedProfile && curatedProfile.timeline.phases.length >= 3) {
    const employable = curatedProfile.timeline.time_to_employable
    const minMonths = clamp(Math.max(1, Math.round(employable.min_weeks / 4.3)), 1, 48)
    const maxMonths = clamp(
      Math.max(minMonths, Math.round(employable.max_weeks / 4.3)),
      minMonths,
      48
    )
    const qualificationWindow = curatedProfile.timeline.time_to_full_qualification
    const assumptions = dedupeBullets(
      [
        ...TEMPLATE_ASSUMPTIONS[templateKey],
        `Full qualification can take about ${qualificationWindow.min_months}-${qualificationWindow.max_months} months, even if you can become employable sooner.`,
        curatedProfile.meta.regulated
          ? 'Exact sequence still varies by province, regulator, employer, or school.'
          : ''
      ],
      4
    )
    return { minMonths, maxMonths, assumptions }
  }

  const fromCareer = parseTimelineRange(report.suggestedCareers[0]?.transitionTime ?? '')

  const minimumFloor =
    templateKey === 'regulated_profession'
      ? 6
      : templateKey === 'regulated_trade'
        ? 3
        : templateKey === 'credentialed_role'
          ? 3
          : templateKey === 'portfolio_role'
            ? 2
            : templateKey === 'experience_ladder_role'
              ? 1
              : 2

  const maximumFloor =
    templateKey === 'regulated_profession'
      ? 18
      : templateKey === 'regulated_trade'
        ? 9
        : templateKey === 'credentialed_role'
          ? 9
          : templateKey === 'portfolio_role'
            ? 7
            : templateKey === 'experience_ladder_role'
              ? 6
              : 7

  let minMonths = Math.max(minimumFloor, fromCareer?.min ?? Math.max(1, Math.round(difficultyScore - 1)))
  let maxMonths = Math.max(maximumFloor, fromCareer?.max ?? Math.max(minMonths + 1, Math.round(difficultyScore + 2)))

  if (targetProfile.certifications.length > 0) {
    minMonths += 1
    maxMonths += Math.min(3, targetProfile.certifications.length)
  }
  if (targetProfile.examRequired) maxMonths += 2
  if (targetProfile.apprenticeshipHours) maxMonths += templateKey === 'regulated_trade' ? 2 : 4
  if (report.marketEvidence?.baselineOnly) maxMonths += 1

  minMonths = clamp(minMonths, 1, 48)
  maxMonths = clamp(Math.max(minMonths, maxMonths), minMonths, 48)

  const assumptions = dedupeBullets(TEMPLATE_ASSUMPTIONS[templateKey], 3)
  return { minMonths, maxMonths, assumptions }
}

function costPrefix(context: TransitionPlanContext) {
  return context.targetProfile.region === 'CA' || /canada|ontario|alberta|british columbia|quebec/i.test(context.location)
    ? 'CA$'
    : '$'
}

function estimateRoadmapCostRange(
  task: string,
  phaseIndex: number,
  context: TransitionPlanContext
) {
  const normalized = normalizeText(task)
  const prefix = costPrefix(context)

  if (context.templateKey === 'regulated_profession') {
    if (/\b(confirm|verify|compare|speak with|list|map)\b/.test(normalized)) {
      return `${prefix}0-${prefix}250 now (document requests or consults can vary by province/regulator)`
    }
    if (/\b(transcript|application|registration|exam|licens|prerequisite)\b/.test(normalized)) {
      return `${prefix}150-${prefix}2,500+ (varies by province, school, and regulator)`
    }
    return `${prefix}50-${prefix}750+ (varies by province/employer)`
  }

  if (context.templateKey === 'regulated_trade') {
    if (/\b(confirm|verify|list|speak with|map)\b/.test(normalized)) {
      return `${prefix}0-${prefix}150 now (tickets and registration can vary by employer/province)`
    }
    if (/\b(ticket|training|registration|school|exam|certif)\b/.test(normalized)) {
      return `${prefix}50-${prefix}900+ (varies by province/employer)`
    }
    return `${prefix}0-${prefix}300`
  }

  if (/\b(outreach|apply|network|follow up|interview)\b/.test(normalized)) {
    return `${prefix}0-${prefix}50`
  }

  if (/\b(course|certif|training|lab|project)\b/.test(normalized)) {
    return phaseIndex === 0 ? `${prefix}0-${prefix}250` : `${prefix}50-${prefix}750`
  }

  return `${prefix}0-${prefix}200`
}

function buildRoadmapPrereqs(
  context: TransitionPlanContext,
  phaseIndex: number
) {
  const prereqs = [
    phaseIndex === 0 && context.targetProfile.education
      ? `Baseline education: ${formatLabel(context.targetProfile.education)}`
      : '',
    ...context.targetProfile.hardGates.slice(0, phaseIndex === 0 ? 2 : 1).map((item) => formatLabel(item)),
    ...context.targetProfile.certifications
      .slice(0, phaseIndex === 0 ? 2 : 1)
      .map((item) => formatLabel(item))
  ].filter(Boolean)

  return dedupeBullets(prereqs, 3)
}

function buildRoadmapProofChecklist(
  context: TransitionPlanContext,
  phase: TransitionModeReport['plan90'][number],
  task: string,
  phaseIndex: number,
  taskIndex: number
) {
  const weeklyTarget = phase.weeklyTargets[taskIndex] ?? phase.weeklyTargets[0] ?? 'One visible checkpoint completed'
  const targetLabel = roleLabel(context)

  return fillToLength(
    dedupeBullets(
      [
        weeklyTarget,
        phaseIndex === 0
          ? 'Save one dated note, email, or checklist that proves this step moved.'
          : 'Save one artifact that proves this step moved this week.',
        phaseIndex === 0 && context.templateKey === 'regulated_profession'
          ? 'Write down the province-specific rule, regulator, or admission requirement you confirmed.'
          : '',
        /\b(outreach|speak with|apply|network)\b/i.test(task)
          ? `Log who you contacted, what you asked, and the next follow-up for ${targetLabel}.`
          : ''
      ],
      3
    ),
    2,
    ['One visible checkpoint completed this week.', 'One saved note showing what changed.']
  ).slice(0, 3)
}

function buildRoadmapGuide(
  context: TransitionPlanContext,
  plan90: TransitionModeReport['plan90'],
  safeFirst3Steps: string[]
) {
  const curatedProfile = context.report.careerPathwayProfile ?? null
  if (curatedProfile) {
    const phases = curatedProfile.timeline.phases.slice(0, 3).map((phase) => ({
      label: phase.phase,
      focus:
        phase.milestones[0]?.done_when ??
        `Move the ${phase.phase.toLowerCase()} phase forward for ${curatedProfile.meta.title}.`,
      steps: phase.milestones.map((milestone) => ({
        title: milestone.title,
        whyItMatters: `This keeps you moving through the ${phase.phase.toLowerCase()} phase for ${curatedProfile.meta.title}.`,
        timeRange: `${phase.duration.min_weeks}-${phase.duration.max_weeks} weeks`,
        costRange:
          phase.phase.toLowerCase().includes('credential') || phase.phase.toLowerCase().includes('exam')
            ? `${costPrefix(context)}150-${costPrefix(context)}2,500+ (varies by province, employer, or school)`
            : `${costPrefix(context)}0-${costPrefix(context)}500+ (varies by employer or provider)`,
        prereqs: dedupeBullets(
          [
            ...curatedProfile.requirements.must_have.slice(0, 3).map((item) => item.name),
            phase.phase.toLowerCase().includes('training')
              ? curatedProfile.entry_paths[0]?.steps[1] ?? ''
              : ''
          ],
          3
        ),
        proofChecklist: fillToLength(
          dedupeBullets(
            [
              milestone.done_when,
              'Save the exact confirmation email, registration, or checklist that proves this milestone is complete.',
              phase.phase.toLowerCase().includes('start')
                ? 'Write down the next named checkpoint and who controls it.'
                : ''
            ],
            3
          ),
          2,
          ['One visible checkpoint completed this week.', 'One saved note showing what changed.']
        ).slice(0, 3)
      }))
    }))

    const next7Days = fillToLength(
      dedupeBullets(
        [
          ...safeFirst3Steps,
          ...((curatedProfile.entry_paths[0]?.steps ?? []).slice(0, 3))
        ],
        5
      ),
      3,
      safeFirst3Steps
    ).slice(0, 5)

    return {
      phases,
      next7Days
    } satisfies NonNullable<TransitionModeReport['roadmapGuide']>
  }

  const phaseLabels = ['0-30 Days', '30-90 Days', '3-12 Months'] as const
  const phaseFocusFallbacks = [
    context.templateKey === 'regulated_profession'
      ? 'Confirm the legal and education sequence before you invest heavily.'
      : 'Confirm the first real gates before you invest heavily.',
    'Build the proof and repetition that makes the path credible.',
    'Turn early momentum into durable eligibility and stronger options.'
  ] as const

  const phases = plan90.map((phase, phaseIndex) => ({
    label: phaseLabels[phaseIndex] ?? phase.phase,
    focus: phase.weeklyTargets[0] ?? phaseFocusFallbacks[phaseIndex] ?? 'Keep momentum visible every week.',
    steps: phase.tasks.map((task, taskIndex) => ({
      title:
        cleanPublicFacingBullet(task) ||
        toSentence(formatLabel(task)) ||
        `Step ${taskIndex + 1}`,
      whyItMatters:
        phaseIndex === 0
          ? context.templateKey === 'regulated_profession'
            ? 'This keeps you from wasting time or money on the wrong province, program, or regulator path.'
            : 'This clarifies the real gate before you apply or spend money.'
          : phaseIndex === 1
            ? 'This turns the plan into proof employers or regulators can actually trust.'
            : 'This keeps momentum moving toward stronger eligibility, better interviews, and better pay.',
      timeRange:
        phaseIndex === 0
          ? '1-2 weeks'
          : phaseIndex === 1
            ? '2-6 weeks'
            : '1-3 months',
      costRange: estimateRoadmapCostRange(task, phaseIndex, context),
      prereqs: buildRoadmapPrereqs(context, phaseIndex),
      proofChecklist: buildRoadmapProofChecklist(context, phase, task, phaseIndex, taskIndex)
    }))
  }))

  return {
    phases,
    next7Days: fillToLength(
      dedupeBullets(
        [
          ...safeFirst3Steps,
          context.templateKey === 'regulated_profession'
            ? 'Ask one regulator, school, or licensing contact to confirm the right first checkpoint for your province.'
            : ''
        ],
        5
      ),
      3,
      safeFirst3Steps
    ).slice(0, 5)
  } satisfies NonNullable<TransitionModeReport['roadmapGuide']>
}

function buildTemplateOutput(context: TransitionPlanContext) {
  const builders: Record<PlanTemplateKey, (value: TransitionPlanContext) => TemplateOutput> = {
    regulated_trade: buildRegulatedTradeTemplate,
    regulated_profession: buildRegulatedProfessionTemplate,
    credentialed_role: buildCredentialedRoleTemplate,
    portfolio_role: buildPortfolioRoleTemplate,
    experience_ladder_role: buildExperienceLadderRoleTemplate,
    general_role: buildGeneralRoleTemplate
  }

  return builders[context.templateKey](context)
}

function fillToLength(values: string[], target: number, fallback: string | string[]) {
  const output = [...values]
  const pool = (Array.isArray(fallback) ? fallback : [fallback]).map((item) => toSentence(item))
  let index = 0

  while (output.length < target) {
    const candidate =
      pool[index] ??
      `Focus on the next measurable step (${output.length + 1}).`
    if (!output.some((item) => normalizeBulletKey(item) === normalizeBulletKey(candidate))) {
      output.push(candidate)
    }
    index += 1
    if (index > pool.length + target) break
  }

  return output
}

function buildEarnings(
  report: PlannerReportSource,
  templateKey: PlanTemplateKey,
  incomeTarget: string
) {
  const primaryCareer = report.suggestedCareers[0] ?? null
  const native = primaryCareer?.salary.native
  const usd = primaryCareer?.salary.usd
  const currency = native?.currency ?? 'USD'

  let low = normalizeHourlyValue(native?.low ?? usd?.low ?? null)
  let high = normalizeHourlyValue(native?.high ?? usd?.high ?? null)
  let median = normalizeHourlyValue(native?.median ?? usd?.median ?? null)

  if (low === null || high === null) {
    const normalizedIncome = normalizeText(incomeTarget)
    const fallbackAnnual =
      normalizedIncome.includes('150') ? { low: 150_000, high: 190_000 } :
      normalizedIncome.includes('100') ? { low: 100_000, high: 140_000 } :
      normalizedIncome.includes('75') ? { low: 75_000, high: 100_000 } :
      normalizedIncome.includes('50') ? { low: 50_000, high: 75_000 } :
      { low: 42_000, high: 65_000 }
    low = low ?? Number((fallbackAnnual.low / 2080).toFixed(1))
    high = high ?? Number((fallbackAnnual.high / 2080).toFixed(1))
    median = median ?? Number((((fallbackAnnual.low + fallbackAnnual.high) / 2) / 2080).toFixed(1))
  }

  const floor =
    templateKey === 'regulated_trade'
      ? 18
      : templateKey === 'regulated_profession'
        ? 22
        : templateKey === 'credentialed_role'
          ? 20
          : 18
  const safeLow = Math.max(floor, low ?? floor)
  const safeHigh = Math.max(safeLow + 4, high ?? safeLow + 8)
  const safeMedian = clamp(median ?? (safeLow + safeHigh) / 2, safeLow, safeHigh)
  const unit = `${currency}/hour`

  return [
    { stage: 'Year 1', rangeLow: Math.round(Math.max(floor, safeLow * 0.9)), rangeHigh: Math.round(Math.max(floor + 2, safeMedian * 0.95)), unit },
    { stage: 'Year 2', rangeLow: Math.round(safeLow), rangeHigh: Math.round(safeMedian), unit },
    { stage: 'Year 3', rangeLow: Math.round(Math.max(safeLow + 1, safeMedian)), rangeHigh: Math.round(Math.max(safeMedian + 2, safeHigh * 0.93)), unit },
    { stage: templateKey === 'regulated_trade' || templateKey === 'regulated_profession' ? 'Fully Qualified' : 'Established', rangeLow: Math.round(Math.max(safeMedian, safeHigh * 0.8)), rangeHigh: Math.round(safeHigh), unit }
  ] satisfies TransitionModeReport['earnings']
}

function buildReality(
  templateKey: PlanTemplateKey,
  report: PlannerReportSource,
  signals: DerivedSignals,
  targetProfile: OccupationTemplateProfile
) {
  const templateBarrier =
    templateKey === 'regulated_trade'
      ? 'Trade hiring often moves through direct relationships and timing, not easy job-board visibility.'
      : templateKey === 'regulated_profession'
        ? 'The sequence matters here. Skipping education or licensure steps wastes time.'
        : templateKey === 'credentialed_role'
          ? 'Study alone is not enough if you cannot show applied proof.'
          : templateKey === 'portfolio_role'
            ? 'Applications stay weak if the portfolio does not clearly match the role.'
            : templateKey === 'experience_ladder_role'
              ? 'Weak positioning can hide the fact that you are already close to the next step.'
              : 'Passive applying usually underperforms if your proof and positioning are not clear.'

  const barriers = fillToLength(
    compressSimilarBullets(
      [
        templateBarrier,
        templateKey === 'regulated_profession'
          ? targetProfile.region === 'CA'
            ? 'This is a regulated profession. Licensing, credential recognition, and timelines can vary by province in Canada.'
            : 'This is a regulated profession. Licensing, credential recognition, and timelines can vary by province or regulator.'
          : '',
        ...signals.missingSignals.map((item) => item.label),
        report.marketEvidence?.baselineOnly
          ? 'Local demand is thin or unclear, so you need live feedback from outreach early.'
          : 'If response rates stay low, your channel mix or positioning needs to tighten quickly.'
      ],
      3
    ),
    3,
    [
      'This move gets harder when weekly output is inconsistent.',
      'Small misses compound when you do not review the plan each week.',
      'Slow feedback loops can hide the real blocker for too long.'
    ]
  ).slice(0, 3)

  const mitigations = fillToLength(
    compressSimilarBullets(
      [
        templateKey === 'regulated_profession'
          ? targetProfile.region === 'CA'
            ? 'Confirm the province-specific regulator, credential-recognition rules, and first application checkpoint before you spend money.'
            : 'Confirm the local regulator, credential-recognition rules, and first application checkpoint before you spend money.'
          : '',
        ...signals.priorityActions,
        'Track applications, outreach, and follow-ups every week so low-yield activity gets cut fast.',
        report.marketEvidence?.baselineOnly
          ? 'Use real conversations to validate demand before you overinvest in one lane.'
          : 'Double down on the channel that creates real conversations first.'
      ],
      3
    ),
    3,
    [
      'Review the plan weekly and replace vague effort with measured output.',
      'Keep the next action specific enough to finish this week.',
      'Use real conversations and results to decide what to keep doing.'
    ]
  ).slice(0, 3)

  return { barriers, mitigations }
}

function toResolutionSummary(input: OccupationResolutionSummary | null | undefined) {
  return input ?? null
}

export function generateTransitionPlan(input: GenerateTransitionPlanInput): TransitionModeReport {
  const currentResolution = toResolutionSummary(input.currentResolution)
  const targetResolution = toResolutionSummary(input.targetResolution)
  const relationship = determineRelationship(
    input.currentRole,
    input.targetRole,
    currentResolution,
    targetResolution
  )
  const targetProfile = buildOccupationProfile(input, relationship)
  const templateKey = selectPlanTemplate(targetProfile, input.location, targetResolution?.stage ?? null)
  const signals = deriveSignals(input, targetProfile, templateKey)

  const context: TransitionPlanContext = {
    currentRole: input.currentRole,
    targetRole: input.targetRole,
    experienceText: input.experienceText ?? '',
    location: input.location ?? '',
    education: input.education ?? '',
    incomeTarget: input.incomeTarget ?? '',
    report: input.report,
    templateKey,
    relationship,
    currentResolution,
    targetResolution,
    targetProfile,
    signals,
    proofBuilderTerm: null
  }

  const templateOutput = buildTemplateOutput(context)
  const first3Steps = fillToLength(
    compressSimilarBullets(
      [
        templateOutput.routes.primary.firstStep,
        ...signals.priorityActions,
        templateOutput.routes.secondary.firstStep
      ],
      3
    ),
    3,
    [
      'Move one concrete blocker onto the calendar this week.',
      'Pick the highest-value next step and schedule it now.',
      'Tie the next action to one visible output you can finish.'
    ]
  ).slice(0, 3)

  const difficulty = buildDifficulty(
    input.report,
    targetProfile,
    templateKey,
    input.education ?? '',
    signals
  )
  const timeline = buildTimeline(input.report, targetProfile, templateKey, difficulty.score)
  const strengthBullets = fillToLength(
    compressSimilarBullets(signals.transferableSignals.map((item) => item.label), 4),
    3,
    [
      'You already bring some usable overlap into this move.',
      'Lead with the strongest overlap when you apply or reach out.',
      'Use the clearest transferable signal as early interview proof.'
    ]
  )
    .map((item) => cleanPublicFacingBullet(item))
    .filter((item) => item && !isPersonalIdentifier(item))
    .slice(0, 4)
  const gapBullets = fillToLength(
    compressSimilarBullets(signals.missingSignals.map((item) => item.action), 4),
    3,
    [
      'Turn the biggest missing requirement into one concrete proof action.',
      'Choose one gap and make the next step visible this week.',
      'Do not leave the top blocker vague or unscheduled.'
    ]
  )
    .map((item) => cleanPublicFacingBullet(item))
    .filter((item) => item && !isPersonalIdentifier(item))
    .slice(0, 4)
  const safeFirst3Steps = fillToLength(
    first3Steps
      .map((item) => cleanPublicFacingBullet(item))
      .filter((item) => item && !isPersonalIdentifier(item)),
    3,
    [
      'Move one concrete blocker onto the calendar this week.',
      'Pick the highest-value next step and schedule it now.',
      'Tie the next action to one visible output you can finish.'
    ]
  ).slice(0, 3)
  const roadmapGuide = buildRoadmapGuide(context, templateOutput.plan90, safeFirst3Steps)

  return TransitionModeSchema.parse({
    definitions: templateOutput.definitions,
    difficulty,
    timeline,
    routes: templateOutput.routes,
    roadmapGuide,
    plan90: templateOutput.plan90,
    execution: templateOutput.execution,
    gaps: {
      strengths: strengthBullets,
      missing: gapBullets,
      first3Steps: safeFirst3Steps
    },
    earnings: buildEarnings(input.report, templateKey, input.incomeTarget ?? ''),
    reality: buildReality(templateKey, input.report, signals, targetProfile),
    resources: {
      local: templateOutput.resources?.local ?? [],
      online: templateOutput.resources?.online ?? [],
      internal: [
        { label: 'CareerHeap Blog', url: '/blog' },
        { label: 'Career Tools', url: '/tools' },
        { label: 'Run This Plan Again', url: '/tools/career-switch-planner' }
      ]
    }
  })
}

export const buildTransitionModeReport = generateTransitionPlan
