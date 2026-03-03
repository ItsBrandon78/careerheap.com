import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import { buildBaseTemplateOutput, makePhase, roleLabel } from '@/lib/transition/templates/common'

export function buildGeneralRoleTemplate(context: TransitionPlanContext): TemplateOutput {
  const target = roleLabel(context)

  return buildBaseTemplateOutput(context, {
    routes: {
      primary: {
        title: 'Primary route: targeted direct move',
        reason:
          'You do not need a full reset here. The fastest path is a focused application strategy paired with clear evidence that your existing background transfers.',
        firstStep: `Shortlist 10 openings for ${target} and identify the top 3 repeated requirements before you apply.`
      },
      secondary: {
        title: 'Secondary route: adjacent-role bridge',
        reason:
          'If the direct move is still too wide, a nearby role can narrow the gap while keeping you close to the target function.',
        firstStep: `Identify 10 adjacent roles that build the missing exposure for ${target}.`
      },
      contingency: {
        title: 'Contingency route: short proof sprint',
        reason:
          'If response quality is weak, stop spraying applications and spend a short sprint turning the top missing requirement into visible proof.',
        firstStep: 'Choose the single highest-value gap and turn it into a clear work sample, project, or interview story this week.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          'Research the top repeated requirements and tighten your resume around the strongest overlap.',
          'Apply to a focused set of roles that actually match your current evidence.',
          'Send 10 direct outreach messages to hiring managers, recruiters, or practitioners.'
        ],
        ['5 target roles analyzed', '8 targeted applications', '10 outreach messages', '1 resume update'],
        6
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          'Turn the top missing requirement into a simple proof action you can reference in interviews.',
          'Keep follow-ups moving until every application gets a clear outcome.',
          'Use feedback from response rates to tighten the next batch of applications.'
        ],
        ['8 applications', '10 follow-ups', '1 proof action completed', '1 weekly adjustment'],
        8
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Push the strongest channel harder: referrals, recruiters, direct outreach, or targeted applications.',
          'Close the biggest remaining objection before it shows up late in interviews.',
          'Keep enough volume going to maintain a stable interview pipeline.'
        ],
        ['8 new applications', '10 follow-ups', '3 live conversations', '1 blocker closed'],
        8
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: review your pipeline and move one live lead forward.',
        '15 minutes: send one direct outreach or follow-up message.',
        '15 minutes: improve one part of your resume, proof, or interview story.'
      ],
      weeklyCadence: ['8 targeted applications', '10 follow-ups', '3 networking touches', '1 proof checkpoint'],
      outreachTemplates: {
        call: `Hi, I am moving into ${target}. I already bring relevant experience, and I am tightening the few gaps that still matter. I would like to understand what gets a candidate taken seriously at the entry point for this role.`,
        email: [
          `Subject: Transitioning into ${target}`,
          '',
          `Hi, I am targeting ${target} as my next move.`,
          'I already bring overlapping experience and I am actively closing the remaining gaps with specific proof.',
          'If you can share what hiring teams care about most at the entry point, I would appreciate it.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [{ label: 'Local networking group or industry meetup (starting point)', url: '' }],
    fallbackOnline: [
      { label: 'Role-specific interview and resume guides', url: '' },
      { label: 'Job search planning checklist', url: '' }
    ]
  })
}
