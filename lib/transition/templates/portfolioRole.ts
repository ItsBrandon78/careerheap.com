import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import {
  buildBaseTemplateOutput,
  defineOnce,
  makePhase,
  PROOF_BUILDER_DEFINITION,
  PROOF_BUILDER_TERM,
  roleLabel
} from '@/lib/transition/templates/common'

export function buildPortfolioRoleTemplate(
  context: TransitionPlanContext
): TemplateOutput {
  const definitions: Record<string, string> = {}
  defineOnce(definitions, 'proofBuilder', PROOF_BUILDER_DEFINITION)
  const target = roleLabel(context)

  return buildBaseTemplateOutput(context, {
    definitions,
    routes: {
      primary: {
        title: 'Primary route: portfolio-first',
        reason:
          'For this kind of move, visible work samples matter as much as your resume. The fastest route is to create a small, focused body of proof and then apply with it.',
        firstStep: `Create 1 strong ${PROOF_BUILDER_TERM} that mirrors a real target-role task.`
      },
      secondary: {
        title: 'Secondary route: freelance or volunteer reps',
        reason:
          'If your portfolio is light, short real-world projects can add credibility faster than waiting for a perfect full-time opening.',
        firstStep: 'Look for 3 small freelance, volunteer, or internal projects you can complete quickly.'
      },
      contingency: {
        title: 'Contingency route: networked referrals',
        reason:
          'If cold applications underperform, use portfolio feedback and referrals to get into better conversations.',
        firstStep: 'Ask 5 practitioners for quick feedback on your work and use those conversations to build warm introductions.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          `Create 1 ${PROOF_BUILDER_TERM} that shows the exact kind of work the target role expects.`,
          'Write simple case notes that explain the problem, your choices, and the result.',
          'Send 10 portfolio-driven outreach messages to practitioners or hiring contacts.'
        ],
        [`1 ${PROOF_BUILDER_TERM}`, '1 case note written', '10 outreach messages', '5 target companies researched'],
        8
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          `Create a second ${PROOF_BUILDER_TERM} in a slightly different format so your examples are not all the same.`,
          'Tighten your portfolio presentation, resume, and short pitch.',
          'Start targeted applications that link directly to your best work.'
        ],
        ['1 new work sample', '8 targeted applications', '8 follow-ups', '2 portfolio reviews'],
        10
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Refine weak spots based on feedback from interviews or portfolio reviews.',
          'Keep outreach and applications focused on roles that actually match your best work.',
          'Practice explaining your work in simple business language.'
        ],
        ['10 applications', '10 follow-ups', '2 feedback conversations', '2 interview story practice sessions'],
        10
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: improve one work sample or case note.',
        '15 minutes: send one direct outreach or follow-up message.',
        '15 minutes: research one employer and tailor your next application.'
      ],
      weeklyCadence: [`1 ${PROOF_BUILDER_TERM}`, '8 targeted applications', '10 follow-ups', '2 feedback conversations'],
      outreachTemplates: {
        call: `Hi, I am moving into ${target}. I am building a focused set of work samples that match the role, and I would like quick guidance on what hiring teams care about most when they review entry-level candidates.`,
        email: [
          `Subject: Building a portfolio for ${target}`,
          '',
          `Hi, I am moving into ${target}.`,
          'I am building focused work samples that match the role and I want to make sure I am aiming at the right standard.',
          'If you can share what hiring teams notice first, I would appreciate it.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [{ label: 'Local design, product, or tech meetup (starting point)', url: '' }],
    fallbackOnline: [
      { label: 'Portfolio review communities', url: '' },
      { label: 'Case-study examples and prompts', url: '' }
    ]
  })
}

