import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import {
  buildBaseTemplateOutput,
  defineOnce,
  makePhase,
  PROOF_BUILDER_DEFINITION,
  PROOF_BUILDER_TERM,
  roleLabel
} from '@/lib/transition/templates/common'

export function buildCredentialedRoleTemplate(
  context: TransitionPlanContext
): TemplateOutput {
  const definitions: Record<string, string> = {}
  defineOnce(definitions, 'proofBuilder', PROOF_BUILDER_DEFINITION)
  const target = roleLabel(context)

  return buildBaseTemplateOutput(context, {
    definitions,
    routes: {
      primary: {
        title: 'Primary route: certificate plus proof',
        reason:
          'This move usually happens when you pair a respected credential with simple proof that you can use it in practice.',
        firstStep: 'Choose one credential or learning path that shows up often in target roles and commit to the first module now.'
      },
      secondary: {
        title: 'Secondary route: adjacent work while learning',
        reason:
          'If you need more time to skill up, use adjacent responsibilities or stretch projects to build credibility while the credential is in progress.',
        firstStep: 'Find one adjacent project, volunteer task, or internal assignment that overlaps with the target role.'
      },
      contingency: {
        title: 'Contingency route: lab-and-practice sprint',
        reason:
          'If interviews are not happening yet, tighten the proof side first with labs, case studies, or short practical demos.',
        firstStep: `Create 1 ${PROOF_BUILDER_TERM} that shows a real target-role skill in action.`
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          'Pick one learning path and start the first lessons or labs.',
          `Create 1 ${PROOF_BUILDER_TERM} tied to a high-value target skill.`,
          'Send 10 targeted outreach messages to people doing the work now.'
        ],
        ['1 learning path started', `1 ${PROOF_BUILDER_TERM}`, '10 outreach messages', '1 skills checklist'],
        8
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          'Keep the certification or learning plan moving every week.',
          'Add one more work sample, case study, or lab result you can discuss in interviews.',
          'Begin targeted applications once your first proof artifacts are ready.'
        ],
        ['2 study blocks per week', '1 new proof item', '8 targeted applications', '8 follow-ups'],
        10
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Finish the first credential milestone or exam checkpoint.',
          'Tighten your resume and interview stories around the proof you built.',
          'Keep applications, networking, and follow-ups moving until interviews are consistent.'
        ],
        ['1 credential checkpoint', '10 applications', '10 follow-ups', '2 interview stories practiced'],
        10
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: move one study, lab, or certification task forward.',
        '15 minutes: keep one application, referral, or follow-up thread moving.',
        '15 minutes: improve one proof item, work sample, or interview answer.'
      ],
      weeklyCadence: ['2 study blocks', '8 targeted applications', '10 follow-ups', `1 ${PROOF_BUILDER_TERM}`],
      outreachTemplates: {
        call: `Hi, I am moving into ${target}. I am already building the core skills and I am working through the most relevant credential path. I would like to understand what proof hiring teams care about most at the entry point.`,
        email: [
          `Subject: Transitioning into ${target}`,
          '',
          `Hi, I am moving into ${target}.`,
          'I am actively building the core skills, working through the most relevant learning path, and creating practical proof I can discuss in interviews.',
          'If you can share what hiring teams value most at the entry point, I would appreciate it.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [{ label: 'Local meetup or professional group (starting point)', url: '' }],
    fallbackOnline: [
      { label: 'Certification roadmap resources', url: '' },
      { label: 'Practice labs or case-study exercises', url: '' }
    ]
  })
}

