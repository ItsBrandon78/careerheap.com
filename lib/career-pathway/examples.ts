import {
  CareerPathwayProfileSchema,
  type CareerPathwayProfile
} from '@/lib/career-pathway/schema'

export const BUILT_IN_CAREER_PATHWAY_PROFILES: CareerPathwayProfile[] = [
  CareerPathwayProfileSchema.parse({
    meta: {
      title: 'Electrician (Construction & Maintenance) (309A) — Ontario',
      slug: 'electrician-construction-maintenance-309a-on',
      jurisdiction: { country: 'CA', region: 'ON' },
      codes: { noc_2021: '72200', trade_code: '309A', onet_soc: null },
      regulated: true,
      last_verified: '2026-03-03'
    },
    snapshot: {
      one_liner:
        'Install, maintain, troubleshoot, and repair electrical systems in residential, commercial, and institutional settings while meeting code and safety standards.',
      what_you_do: [
        'Run and terminate wire or conduit, and install panels, devices, lighting, and controls.',
        'Test and diagnose faults, verify compliance with code, and document work.'
      ],
      where_you_work: ['Construction sites', 'Commercial and institutional buildings', 'Service calls'],
      who_hires: ['Electrical contractors', 'Facilities teams', 'Union contractors (IBEW)']
    },
    entry_paths: [
      {
        path_name: 'Apprenticeship (standard)',
        who_its_for:
          'People starting from zero or coming from adjacent hands-on work such as construction, maintenance, HVAC, or kitchen operations.',
        steps: [
          'Get hired by a sponsor employer such as a contractor or union shop.',
          'Register an apprenticeship agreement in Ontario.',
          'Accumulate required on-the-job hours and complete in-school training levels.',
          'Write the certifying exam to receive the Certificate of Qualification.'
        ],
        time_to_first_job_weeks: { min: 2, max: 16 }
      }
    ],
    requirements: {
      must_have: [
        {
          type: 'legal',
          name: 'Registered apprenticeship with sponsor',
          details: 'Program is administered by Skilled Trades Ontario.'
        },
        {
          type: 'training',
          name: 'In-school training levels',
          details:
            'Electrical trades curriculum is organized into levels, and 309A includes a distinct fourth level.'
        },
        {
          type: 'exam',
          name: 'Certifying exam (Certificate of Qualification)',
          details:
            'The trade has a certifying exam, and passing leads to the Certificate of Qualification.'
        }
      ],
      nice_to_have: [
        {
          type: 'health_safety',
          name: 'WHMIS or Working at Heights',
          details: 'Common site requirements that improve hireability.'
        },
        {
          type: 'health_safety',
          name: 'First Aid / CPR',
          details: 'Often requested on job sites and useful for employer trust.'
        }
      ],
      tools_or_gear: ['Basic hand tools', 'PPE (site-dependent)', 'Meters and testing tools']
    },
    timeline: {
      time_to_employable: { min_weeks: 2, max_weeks: 16 },
      time_to_full_qualification: { min_months: 48, max_months: 72 },
      phases: [
        {
          phase: 'Start',
          duration: { min_weeks: 2, max_weeks: 12 },
          milestones: [
            {
              title: 'Get sponsor employer',
              done_when: 'You have an offer as an apprentice or helper.'
            },
            {
              title: 'Register apprenticeship',
              done_when: 'Your training agreement is active.'
            }
          ]
        },
        {
          phase: 'Training',
          duration: { min_weeks: 156, max_weeks: 312 },
          milestones: [
            {
              title: 'Accumulate on-the-job hours',
              done_when:
                'You complete the program hours target, often cited as about 9,000 hours.'
            },
            {
              title: 'Complete in-school levels',
              done_when:
                'All required levels are complete, including the 309A-specific level.'
            }
          ]
        },
        {
          phase: 'Credentialing',
          duration: { min_weeks: 2, max_weeks: 12 },
          milestones: [
            {
              title: 'Write the Certificate of Qualification / Red Seal exam',
              done_when:
                'You pass the certifying exam. Program materials commonly reference 70% as the pass benchmark.'
            }
          ]
        }
      ]
    },
    progression: {
      levels: [
        {
          level: 'Entry',
          title: 'Apprentice Electrician',
          typical_time: '0-5 years',
          what_changes: ['Hours accumulate', 'Responsibility increases', 'School levels completed']
        },
        {
          level: 'Qualified',
          title: 'Journeyperson (Certificate of Qualification)',
          typical_time: 'After exam',
          what_changes: ['Can work as a certified journeyperson', 'Higher wage ceiling']
        },
        {
          level: 'Advanced',
          title: 'Red Seal endorsed',
          typical_time: 'After interprovincial exam',
          what_changes: ['Mobility across Canada', 'Stronger hiring signal']
        }
      ]
    },
    wages: {
      currency: 'CAD',
      hourly: [
        {
          region: 'Canada (varies by province)',
          low: null,
          median: null,
          high: null,
          source: 'Job Bank wage report (NOC 72200)'
        }
      ],
      notes: 'Pull exact numbers dynamically per province or region from Job Bank wage tables.'
    },
    difficulty: {
      overall_1_5: 4,
      why: ['Getting a sponsor is the bottleneck.', 'The path takes years because it combines hours and school.'],
      common_failure_points: [
        'No sponsor employer secured early enough.',
        'Hours are inconsistent and not tracked cleanly.',
        'Exam preparation is left too late.'
      ]
    },
    skills: {
      core: ['Electrical fundamentals', 'Code literacy', 'Troubleshooting'],
      tools_tech: ['Meters and testing tools', 'Conduit and wiring', 'Panels and devices'],
      soft_skills: ['Safety discipline', 'Communication on job sites', 'Documentation']
    },
    resources: {
      official: [
        {
          title: 'Skilled Trades Ontario — Electrician (Construction and Maintenance)',
          url: 'https://www.skilledtradesontario.ca/trade-information/electrician-construction-and-maintenance/'
        },
        {
          title: 'Red Seal program information',
          url: 'https://www.red-seal.ca/eng/welcome.shtml'
        }
      ],
      training: [
        {
          title: 'Electrical Trades curriculum (levels and hours structure)',
          url: 'https://www.skilledtradesontario.ca/wp-content/uploads/1970/01/Electrical-Trades-309A-309C-442A-Curriculum-L1234-Dec-22-2023-EN.pdf'
        }
      ],
      job_search: [
        {
          title: 'Job Bank wage report (NOC 72200)',
          url: 'https://www.jobbank.gc.ca/wagereport/occupation/20684'
        }
      ]
    },
    sources: [
      {
        title: 'Skilled Trades Ontario trade page (309A)',
        url: 'https://www.skilledtradesontario.ca/trade-information/electrician-construction-and-maintenance/',
        publisher: 'Skilled Trades Ontario',
        accessed_at: '2026-03-03'
      },
      {
        title: 'Electrical Trades curriculum L1234',
        url: 'https://www.skilledtradesontario.ca/wp-content/uploads/1970/01/Electrical-Trades-309A-309C-442A-Curriculum-L1234-Dec-22-2023-EN.pdf',
        publisher: 'Skilled Trades Ontario',
        accessed_at: '2026-03-03'
      },
      {
        title: 'Job Bank wage report (NOC 72200)',
        url: 'https://www.jobbank.gc.ca/wagereport/occupation/20684',
        publisher: 'Government of Canada',
        accessed_at: '2026-03-03'
      }
    ]
  })
]
