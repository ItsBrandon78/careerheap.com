import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import { buildBaseTemplateOutput, makePhase, roleLabel } from '@/lib/transition/templates/common'

export function buildRegulatedProfessionTemplate(
  context: TransitionPlanContext
): TemplateOutput {
  const target = roleLabel(context)
  const regionLabel =
    context.location.trim() ||
    (context.targetProfile.region === 'CA' ? 'your province in Canada' : 'your state or province')
  const regulatorWarning =
    context.targetProfile.region === 'CA' || /canada/i.test(regionLabel)
      ? 'Requirements vary by province, regulator, and credential-recognition path if you trained outside Canada.'
      : 'Requirements vary by state, regulator, and employer.'

  return buildBaseTemplateOutput(context, {
    routes: {
      primary: {
        title: 'Primary route: education plus licensure sequence',
        reason:
          `This move is gated by formal education, supervised practice, and a licensing body. ${regulatorWarning} The fastest path is the one that clears those gates in the correct order.`,
        firstStep: `Verify the exact education, licensing, and supervised-practice sequence for ${regionLabel} before you spend money.`
      },
      secondary: {
        title: 'Secondary route: adjacent support role first',
        reason:
          'If the full credential path takes time, an adjacent support role can build exposure, references, and confidence while you work through the main requirements.',
        firstStep: `Identify 5 support or assistant roles that sit close to ${target} and use them as paid proximity while you qualify.`
      },
      contingency: {
        title: 'Contingency route: prerequisite bridge',
        reason:
          'If you are missing coursework or admissions requirements, solve the prerequisite problem first instead of applying too early.',
        firstStep: 'Shortlist bridge programs, prerequisite courses, or entry requirements you can close in the next 30 days.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-2',
        '1-2',
        [
          `Confirm the required degree, licensing body, exam path, and supervised-practice sequence for ${regionLabel}.`,
          `Confirm whether credential recognition, bridging, or province-specific registration applies in ${regionLabel}.`,
          'Compare programs or routes by cost, admissions timeline, and time to licensure.',
          'Speak with 3 people already in the field so you understand the real training path.'
        ],
        ['1 province-specific licensing checklist', '3 information interviews', '3 route options compared', '1 cost-and-time estimate'],
        8
      ),
      makePhase(
        'Weeks 3-6',
        '3-6',
        [
          'Start prerequisite applications, transcripts, or exam prep.',
          'Collect any volunteer, shadowing, or support-role experience that strengthens your application.',
          'Map funding, scheduling, and timeline constraints before you commit.'
        ],
        ['3 application steps completed', '2 prerequisite items closed', '1 shadow or volunteer touchpoint', '1 funding plan'],
        10
      ),
      makePhase(
        'Weeks 7-12',
        '7-12',
        [
          'Submit the first formal applications or registrations.',
          'Build a realistic timeline for supervised practice, exam prep, and first employable milestone.',
          'Keep adjacent-role outreach active so you stay close to the field while credentials are in motion.'
        ],
        ['1 formal submission', '1 licensing timeline map', '5 adjacent-role outreach touches', '1 follow-up cycle'],
        10
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: move one admissions, licensing, or paperwork task forward.',
        '15 minutes: maintain one relationship with a practitioner, mentor, or recruiter in the field.',
        '15 minutes: review your timeline, deadlines, and next checkpoint.'
      ],
      weeklyCadence: [
        '2 licensing or admissions tasks',
        '3 professional conversations',
        '1 prerequisite or study checkpoint',
        '1 timeline review'
      ],
      outreachTemplates: {
        call: `Hi, I am planning a move into ${target}. I want to make sure I follow the correct licensing and training sequence for my region. Who can confirm the right first step so I do not waste time?`,
        email: [
          `Subject: Clarifying the path into ${target}`,
          '',
          `Hi, I am planning a transition into ${target}.`,
          'I am mapping the correct education, licensing, and supervised-practice sequence and want to make sure I start with the right step.',
          'If you can point me to the best first action, I would appreciate it.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [
      { label: 'Regional licensing board or authority', url: '' },
      { label: 'Approved training programs (starting points)', url: '' }
    ],
    fallbackOnline: [{ label: 'Licensure and exam overview resources', url: '' }]
  })
}
