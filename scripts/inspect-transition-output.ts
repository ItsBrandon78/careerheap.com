import { extractProfileSignals } from '@/lib/planner/profileSignals'
import { generateTransitionPlan } from '@/lib/transition/generatePlan'

const experienceText = [
  'Brandon McKenna',
  'WHMIS',
  'First Aid/CPR',
  'CSTS',
  'OSHA',
  "Driver's License",
  'Led a 6-person kitchen team during peak rush periods.',
  'Handled fast-paced prep, safety checklists, and shift handoffs.',
  'Skills: Teamwork, Safety Focused, Physical Stamina',
  "Certifications: WHMIS, First Aid/CPR, CSTS, OSHA, Driver's License"
].join('\n')

const profile = extractProfileSignals({
  experienceText,
  explicitSkills: ['Teamwork', 'Safety Focused', 'Physical Stamina']
})

const transition = generateTransitionPlan({
  currentRole: 'Sous Chef',
  targetRole: 'Apprentice Electrician',
  experienceText,
  location: 'Toronto, Ontario, Canada',
  education: 'High school',
  incomeTarget: '$50-75k',
  report: {
    compatibilitySnapshot: {
      score: 58,
      topReasons: ['Some transferable overlap exists.']
    },
    suggestedCareers: [
      {
        occupationId: '47-2111',
        title: 'Electricians',
        score: 81,
        transitionTime: '3-6 months',
        regulated: true,
        topReasons: ['Hands-on pace and safety discipline transfer well.'],
        salary: {
          native: {
            currency: 'CAD',
            low: 22,
            median: 34,
            high: 55,
            sourceName: 'Mock',
            asOfDate: '2026-03-03',
            region: 'Ontario'
          },
          usd: null,
          conversion: null
        }
      },
      {
        occupationId: '49-9021',
        title: 'HVAC Technicians',
        score: 74,
        transitionTime: '3-6 months',
        regulated: true,
        topReasons: ['Another trade pathway with similar entry habits.'],
        salary: {
          native: null,
          usd: null,
          conversion: null
        }
      },
      {
        occupationId: '47-2152',
        title: 'Plumbers',
        score: 70,
        transitionTime: '3-6 months',
        regulated: true,
        topReasons: ['Field work, reliability, and sponsor-based entry are similar.'],
        salary: {
          native: null,
          usd: null,
          conversion: null
        }
      }
    ],
    targetRequirements: {
      education: 'High school',
      certifications: ['WHMIS', 'Working at Heights'],
      hardGates: ['Apprenticeship registration', 'Employer sponsor'],
      employerSignals: [
        'Electrical theory basics',
        'Multimeter and hand tools',
        'Blueprint reading',
        '2 years of role-relevant experience'
      ],
      apprenticeshipHours: 1,
      examRequired: true,
      regulated: true,
      sources: []
    },
    transitionSections: {
      mandatoryGateRequirements: [
        {
          label: 'Apprenticeship registration',
          gapLevel: 'missing',
          howToGet: 'Apply with sponsor.'
        }
      ],
      coreHardSkills: [
        {
          label: 'Electrical theory basics',
          gapLevel: 'missing',
          howToLearn: 'Study basics.'
        },
        {
          label: 'Blueprint reading',
          gapLevel: 'missing',
          howToLearn: 'Practice layouts.'
        }
      ],
      toolsPlatforms: [
        {
          label: 'Multimeter',
          gapLevel: 'missing',
          quickProject: 'Safe demo practice.'
        }
      ],
      experienceSignals: [
        {
          label: '2 years of role-relevant experience',
          gapLevel: 'missing',
          howToBuild: 'Build proof.'
        }
      ],
      transferableStrengths: [
        {
          label: 'Brandon McKenna',
          requirement: 'Reliability',
          source: 'experience_text'
        }
      ]
    },
    transitionReport: {
      marketSnapshot: {
        role: 'Electricians',
        location: 'Toronto, Ontario, Canada',
        summaryLine: 'Mock snapshot'
      },
      transferableStrengths: [{ strength: 'Brandon McKenna' }]
    },
    marketEvidence: {
      baselineOnly: false,
      postingsCount: 12,
      query: { location: 'Toronto, Ontario, Canada' }
    },
    linksResources: [],
    dataTransparency: {
      inputsUsed: [],
      datasetsUsed: [],
      fxRateUsed: null
    }
  },
  currentResolution: {
    title: 'Chefs and Head Cooks',
    code: '35-1011',
    source: 'O*NET',
    confidence: 0.91,
    rawInputTitle: 'sous chef',
    region: 'US'
  },
  targetResolution: {
    title: 'Electricians',
    code: '47-2111',
    source: 'O*NET',
    confidence: 0.98,
    stage: 'apprentice',
    rawInputTitle: 'apprentice electrician',
    region: 'CA'
  }
})

console.log(
  JSON.stringify(
    {
      profile,
      quickWins: transition.gaps.strengths,
      primaryGaps: transition.gaps.missing,
      first3Steps: transition.gaps.first3Steps
    },
    null,
    2
  )
)
