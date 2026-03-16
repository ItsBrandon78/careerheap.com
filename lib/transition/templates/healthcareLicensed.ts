import type { TemplateOutput, TransitionPlanContext } from '@/lib/transition/types'
import { buildBaseTemplateOutput, makePhase, roleLabel } from '@/lib/transition/templates/common'

type HealthcareRoleTrack = 'nurse' | 'dental_hygienist' | 'pharmacy_technician' | 'generic'

function detectHealthcareRoleTrack(context: TransitionPlanContext): HealthcareRoleTrack {
  const normalized = `${context.targetProfile.title} ${context.targetRole}`.toLowerCase()
  if (/\b(dental hygienist|hygienist)\b/.test(normalized)) return 'dental_hygienist'
  if (/\b(pharmacy technician|pharmacy tech)\b/.test(normalized)) return 'pharmacy_technician'
  if (/\b(registered nurse|licensed practical nurse|practical nurse|nurse|rn|rpn|lpn)\b/.test(normalized)) {
    return 'nurse'
  }
  return 'generic'
}

export function buildHealthcareLicensedTemplate(
  context: TransitionPlanContext
): TemplateOutput {
  const target = roleLabel(context)
  const track = detectHealthcareRoleTrack(context)
  const regionLabel =
    context.location.trim() ||
    (context.targetProfile.region === 'CA' ? 'your province in Canada' : 'your local regulator area')
  const regulatorReference =
    track === 'dental_hygienist'
      ? 'the College of Dental Hygienists of Ontario (CDHO) or your provincial dental hygiene regulator'
      : track === 'pharmacy_technician'
        ? 'the Ontario College of Pharmacists (OCP) or your provincial pharmacy regulator'
        : track === 'nurse'
          ? 'the College of Nurses of Ontario (CNO) or your provincial nursing regulator'
          : 'your provincial healthcare regulator'
  const licensingExamReference =
    track === 'dental_hygienist'
      ? 'the NDHCE and regulator registration requirements'
      : track === 'pharmacy_technician'
        ? 'the PEBC pathway and regulator registration requirements'
        : track === 'nurse'
          ? 'the CPNRE/NCLEX pathway and regulator registration requirements'
          : 'the required licensing exam and regulator registration requirements'
  const clinicalReference =
    track === 'dental_hygienist'
      ? 'required clinical placements and patient chairside competencies'
      : track === 'pharmacy_technician'
        ? 'supervised pharmacy practicum hours and dispensary competencies'
        : track === 'nurse'
          ? 'required clinical placements and supervised care competencies'
        : 'required supervised clinical placement hours and competencies'
  const fallbackRegulatorLabel =
    track === 'dental_hygienist'
      ? 'Provincial dental hygiene regulator'
      : track === 'pharmacy_technician'
        ? 'Provincial pharmacy regulator'
        : track === 'nurse'
          ? 'Provincial nursing regulator'
          : 'Provincial healthcare regulator'
  const fallbackProgramLabel =
    track === 'dental_hygienist'
      ? 'Accredited dental hygiene programs'
      : track === 'pharmacy_technician'
        ? 'Accredited pharmacy technician programs'
        : track === 'nurse'
          ? 'Accredited nursing programs'
          : 'Accredited healthcare programs'
  const fallbackExamLabel =
    track === 'dental_hygienist'
      ? 'NDHCE and registration pathway overview'
      : track === 'pharmacy_technician'
        ? 'PEBC and provincial registration overview'
        : track === 'nurse'
          ? 'CPNRE/NCLEX and registration overview'
          : 'Licensing exam and registration overview'

  return buildBaseTemplateOutput(context, {
    routes: {
      primary: {
        title: 'Primary route: education, clinical hours, and licensing',
        reason:
          `This move depends on an accredited program, ${clinicalReference}, and registration with ${regulatorReference} for ${regionLabel}. The fastest path is the one that clears those gates in order.`,
        firstStep: `Confirm the exact program, admissions requirements, ${licensingExamReference}, and registration path for ${regionLabel}.`
      },
      secondary: {
        title: 'Secondary route: adjacent patient-care support role',
        reason:
          'If the full program takes time, a support role can help you build field exposure, references, and confidence while you move through the education and licensing sequence.',
        firstStep: `Shortlist 5 support roles that sit close to ${target} and can build patient-care exposure while you qualify.`
      },
      contingency: {
        title: 'Contingency route: prerequisite and admissions bridge',
        reason:
          'If you are missing prerequisite courses or admissions requirements, solve those first instead of paying for the wrong school or applying too early.',
        firstStep: 'Map the prerequisite courses, admissions tests, or bridge programs you can close in the next 30 days.'
      }
    },
    plan90: [
      makePhase(
        'Weeks 1-4',
        '1-4',
        [
          `Confirm the accredited program, admissions prerequisites, ${licensingExamReference}, and provincial registration sequence for ${regionLabel}.`,
          `Compare program options by length, tuition, and ${clinicalReference}.`,
          `Speak with 3 practitioners or advisors aligned to ${target} so you understand the real path before you commit.`
        ],
        ['1 regulator checklist', '3 route comparisons', '3 field conversations', '1 admissions timeline'],
        8
      ),
      makePhase(
        'Months 2-6',
        '5-24',
        [
          'Start prerequisite coursework, transcripts, or admissions steps for the accredited program.',
          `Build relevant exposure through volunteer, support, or adjacent healthcare roles connected to ${target}.`,
          'Map funding, schedule, and placement constraints before accepting a program.'
        ],
        ['2 admissions tasks closed', '1 prerequisite milestone', '1 patient-care exposure plan', '1 funding plan'],
        10
      ),
      makePhase(
        'Final licensing phase',
        '24+',
        [
          'Complete the accredited program and required supervised placements.',
          `Prepare for ${licensingExamReference} and final regulator submission.`,
          'Target entry-level healthcare roles as you clear the final regulator checkpoint.'
        ],
        ['1 program completion milestone', '1 licensing exam plan', '1 regulator submission checklist', '5 entry-role targets'],
        10
      )
    ],
    execution: {
      dailyRoutine: [
        '15 minutes: move one admissions, paperwork, or regulator task forward.',
        `15 minutes: maintain one healthcare relationship with an instructor, advisor, recruiter, or ${target} practitioner.`,
        '15 minutes: review your next education, placement, or licensing checkpoint.'
      ],
      weeklyCadence: [
        '2 admissions or regulator tasks',
        '2 program or prerequisite steps',
        '2 healthcare field conversations',
        '1 timeline review'
      ],
      outreachTemplates: {
        call: `Hi, I am planning a move into ${target}. I want to make sure I follow the right program, placement, and licensing sequence for ${regionLabel}. Who can confirm the correct first step so I do not waste time or tuition?`,
        email: [
          `Subject: Clarifying the path into ${target}`,
          '',
          `Hi, I am planning a transition into ${target}.`,
          `I am mapping the right education program, ${clinicalReference}, and licensing sequence and want to make sure I start with the correct first step.`,
          'If you can point me to the best first action, I would appreciate it.',
          '',
          'Best,',
          'Your Name'
        ].join('\n')
      }
    },
    fallbackLocal: [
      { label: fallbackRegulatorLabel, url: '' },
      { label: `${fallbackProgramLabel} (starting points)`, url: '' }
    ],
    fallbackOnline: [
      { label: fallbackExamLabel, url: '' },
      { label: 'Healthcare program admissions guidance', url: '' }
    ]
  })
}
