import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import { buildBaseTemplateOutput, makePhase, progressionLabel } from '@/lib/transition/templates/common'

export function buildExperienceLadderRoleTemplate(
  context: TransitionPlanContext
): TemplateOutput {
  const target = progressionLabel(context)

  return buildBaseTemplateOutput(context, {
    routes: {
      primary: {
        title: 'Primary route: outcome-first progression',
        reason:
          'This move usually happens when you make your existing results look directly relevant to the next level. Tight positioning and measurable wins matter more than starting from scratch.',
        firstStep: 'Write down 3 measurable wins from your current work that prove you can already handle part of the next-level scope.'
      },
      secondary: {
        title: 'Secondary route: adjacent title bridge',
        reason:
          'If the exact title jump is a stretch today, a nearby title can give you the scope, reporting line, or team exposure you need before the full move.',
        firstStep: `List 10 adjacent roles that move you closer to ${target} without requiring a full reset.`
      },
      contingency: {
        title: 'Contingency route: internal or cross-functional stretch',
        reason:
          'If external responses stay thin, build the missing scope internally through stretch work, temporary ownership, or cross-functional projects.',
        firstStep: 'Ask for one stretch project or cross-functional responsibility this month that gives you visible leadership or ownership proof.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          'Document 3 quantified wins that translate directly into the next role.',
          'Rewrite your resume and LinkedIn headline to match the scope of the target role.',
          'Send 10 outreach messages to managers, peers, or recruiters who hire for the next step.'
        ],
        ['3 quantified wins documented', '1 resume positioning update', '10 outreach messages', '5 target roles shortlisted'],
        6
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          'Apply to roles where your current outcomes already match at least half the scope.',
          'Practice 2 short stories that show ownership, coordination, or decision-making at the next level.',
          'Ask for referrals or warm introductions instead of relying on cold applications alone.'
        ],
        ['8 targeted applications', '10 follow-ups', '2 promotion-ready stories practiced', '3 referral asks'],
        8
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Tighten your positioning based on interview feedback and response quality.',
          'Close the biggest title-gap objection with one concrete result, project, or endorsement.',
          'Keep momentum high until you have a stable pipeline of interviews or internal conversations.'
        ],
        ['8 new applications', '10 follow-ups', '1 title-gap proof item', '1 weekly pipeline review'],
        8
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: move one application, referral, or recruiter thread forward.',
        '15 minutes: tighten one result statement, resume bullet, or interview story.',
        '15 minutes: research one team, company, or hiring manager tied to your next step.'
      ],
      weeklyCadence: [
        '8 targeted applications',
        '10 follow-ups',
        '3 referral or networking asks',
        '1 positioning review'
      ],
      outreachTemplates: {
        call: `Hi, I am targeting ${target} next. My background already covers a meaningful part of the scope, and I can point to measurable results that map directly to the role. I would like to understand what hiring teams value most at this step.`,
        email: [
          `Subject: Targeting the next step into ${target}`,
          '',
          `Hi, I am positioning for ${target} as my next move.`,
          'I already bring relevant results and I am tightening how I present them for this level.',
          'If you can share what hiring teams prioritize most at this step, I would appreciate the guidance.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [{ label: 'Local professional association or meetup (starting point)', url: '' }],
    fallbackOnline: [
      { label: 'Role scope and leveling benchmarks', url: '' },
      { label: 'Leadership and interview story prompts', url: '' }
    ]
  })
}
