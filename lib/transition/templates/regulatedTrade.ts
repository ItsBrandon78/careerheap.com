import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import {
  buildBaseTemplateOutput,
  defineOnce,
  makePhase,
  PROOF_BUILDER_DEFINITION,
  PROOF_BUILDER_TERM,
  roleLabel
} from '@/lib/transition/templates/common'

export function buildRegulatedTradeTemplate(context: TransitionPlanContext): TemplateOutput {
  const definitions: Record<string, string> = {}
  defineOnce(definitions, 'proofBuilder', PROOF_BUILDER_DEFINITION)
  const target = roleLabel(context)
  const isCanada = context.targetResolution?.region === 'CA'

  return buildBaseTemplateOutput(context, {
    definitions,
    routes: {
      primary: {
        title: 'Primary route: helper to registered apprenticeship',
        reason:
          'Start by getting around the no-experience objection. Land a helper or entry-level site role, then turn that employer relationship into formal apprenticeship registration.',
        firstStep: 'Build a list of 15 contractors or trade employers and ask directly about helper, trainee, or apprentice starts.'
      },
      secondary: {
        title: 'Secondary route: pre-apprenticeship first',
        reason:
          'If employer response is weak, use a short pre-apprenticeship or trade-school bridge to tighten your fundamentals, then re-enter the market with better positioning.',
        firstStep: 'Shortlist 3 pre-apprenticeship or trade-school options and compare cost, start dates, and employer links.'
      },
      contingency: {
        title: 'Contingency route: agency or temp jobsite bridge',
        reason:
          'If direct hiring is slow, use agency, labor, or maintenance placements to build site hours, references, and warm contacts.',
        firstStep: 'Contact 5 labor, maintenance, or contractor staffing sources and ask for entry-level placements that create trade-adjacent hours.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          `Confirm the minimum entry requirements for ${target} in your area: education baseline, physical demands, and any safety prerequisites.`,
          'Choose a lane: union apprenticeship, non-union apprenticeship, or a short pre-apprenticeship bridge.',
          `Create 1 ${PROOF_BUILDER_TERM} using safe demo-board or simulation practice so you can show you take training seriously.`,
          'Send 15 direct outreach messages to employers and training contacts.'
        ],
        ['15 outreach messages', '3 pathway options compared', `1 ${PROOF_BUILDER_TERM}`, '1 entry requirement checklist'],
        8
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          'Focus on sponsor or employer conversations and ask what registration step comes first in your area.',
          'Keep applications and follow-ups moving while you close the first technical or safety gap.',
          'Line up any starter training, site docs, or application paperwork the pathway requires.'
        ],
        ['10 targeted applications', '15 follow-ups', '2 live pathway conversations', '1 paperwork checkpoint'],
        10
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Push for a formal start: employer sponsor, training agreement, or apprenticeship intake.',
          'Track how on-the-job hours and technical schooling are recorded so you understand the full path.',
          isCanada
            ? 'Map the later licensing path: Certificate of Qualification and Red Seal if it applies in your province.'
            : 'Map the later licensing path: any state exam, registration, or local licensing milestone that comes after supervised hours.'
        ],
        ['1 formal pathway commitment', '1 hours-and-schooling plan', '5 warm follow-ups', '1 long-range licensing note'],
        10
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: review open applications, follow-ups, and employer replies.',
        '15 minutes: contact one employer, union intake, or training lead directly.',
        '15 minutes: move one training, safety, or paperwork step forward.'
      ],
      weeklyCadence: [
        '15 direct outreach messages',
        '10 targeted applications',
        '2 conversations with pathway contacts',
        `1 ${PROOF_BUILDER_TERM}`
      ],
      outreachTemplates: {
        call: `Hi, I am moving into ${target} and I am looking for the right entry point. I am open to helper, trainee, or apprentice starts. I am already working on the first training steps and I can move quickly. Who handles entry-level hiring or apprenticeship intake?`,
        email: [
          `Subject: Entry path into ${target}`,
          '',
          `Hi, I am transitioning into ${target} and I am looking for the right entry path.`,
          'I am open to helper, trainee, or apprenticeship starts and I am already working through the first requirements.',
          'If you hire entry-level people or can point me to the right intake step, I would appreciate the direction.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [
      { label: 'Local apprenticeship authority (your province/state)', url: '' },
      { label: 'Union intake information', url: '' },
      { label: 'Non-union apprenticeship providers (starting points)', url: '' }
    ],
    fallbackOnline: [{ label: 'Basic trade theory course (online)', url: '' }]
  })
}

