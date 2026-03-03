import {
  CareerPathwayProfileSchema,
  type CareerPathwayProfile
} from '@/lib/career-pathway/schema'

type OntarioProfileInput = {
  title: string
  slug: string
  noc: string
  tradeCode?: string | null
  teer: 0 | 1 | 2 | 3 | 4 | 5
  pathwayType:
    | 'trade_apprenticeship'
    | 'regulated_profession'
    | 'non_regulated'
    | 'credential_stack'
  regulated: boolean
  oneLiner: string
  whatYouDo: string[]
  whoHires: string[]
  entryPath: {
    pathName: string
    whoItsFor: string
    steps: string[]
    timeToFirstJobWeeks: { min: number; max: number }
  }
  requirements: {
    mustHave: Array<{ type: string; name: string; details: string }>
    niceToHave: Array<{ type: string; name: string; details: string }>
    toolsOrGear: string[]
  }
  timeline: {
    employableWeeks: { min: number; max: number }
    fullQualificationMonths: { min: number; max: number }
    phases: Array<{
      phase: string
      durationWeeks: { min: number; max: number }
      milestones: Array<{ title: string; doneWhen: string }>
    }>
  }
  progression: Array<{
    level: string
    title: string
    typicalTime: string
    whatChanges: string[]
  }>
  wagesByProvince: Array<{
    province: string
    low: number | null
    median: number | null
    high: number | null
    source: string
  }>
  difficulty: {
    overall: 1 | 2 | 3 | 4 | 5
    why: string[]
    commonFailurePoints: string[]
  }
  skills: {
    core: string[]
    toolsTech: string[]
    softSkills: string[]
  }
  resources: {
    official: Array<{ title: string; url: string }>
    training: Array<{ title: string; url: string }>
    jobSearch: Array<{ title: string; url: string }>
  }
  sources: Array<{ title: string; url: string; publisher: string; accessedAt: string }>
}

function buildOntarioProfile(input: OntarioProfileInput): CareerPathwayProfile {
  return CareerPathwayProfileSchema.parse({
    meta: {
      title: input.title,
      slug: input.slug,
      jurisdiction: { country: 'CA', region: 'ON' },
      codes: {
        noc_2021: input.noc,
        trade_code: input.tradeCode ?? null,
        onet_soc: null
      },
      teer: input.teer,
      pathway_type: input.pathwayType,
      regulated: input.regulated,
      last_verified: '2026-03-03'
    },
    snapshot: {
      one_liner: input.oneLiner,
      what_you_do: input.whatYouDo,
      where_you_work: ['Ontario', 'Canada'],
      who_hires: input.whoHires
    },
    entry_paths: [
      {
        path_name: input.entryPath.pathName,
        who_its_for: input.entryPath.whoItsFor,
        steps: input.entryPath.steps,
        time_to_first_job_weeks: {
          min: input.entryPath.timeToFirstJobWeeks.min,
          max: input.entryPath.timeToFirstJobWeeks.max
        }
      }
    ],
    requirements: {
      must_have: input.requirements.mustHave,
      nice_to_have: input.requirements.niceToHave,
      tools_or_gear: input.requirements.toolsOrGear
    },
    timeline: {
      time_to_employable: {
        min_weeks: input.timeline.employableWeeks.min,
        max_weeks: input.timeline.employableWeeks.max
      },
      time_to_full_qualification: {
        min_months: input.timeline.fullQualificationMonths.min,
        max_months: input.timeline.fullQualificationMonths.max
      },
      phases: input.timeline.phases.map((phase) => ({
        phase: phase.phase,
        duration: {
          min_weeks: phase.durationWeeks.min,
          max_weeks: phase.durationWeeks.max
        },
        milestones: phase.milestones.map((milestone) => ({
          title: milestone.title,
          done_when: milestone.doneWhen
        }))
      }))
    },
    progression: {
      levels: input.progression.map((level) => ({
        level: level.level,
        title: level.title,
        typical_time: level.typicalTime,
        what_changes: level.whatChanges
      }))
    },
    wages: {
      currency: 'CAD',
      hourly: input.wagesByProvince.map((item) => ({
        region: item.province,
        low: item.low,
        median: item.median,
        high: item.high,
        source: item.source
      })),
      notes: 'Wages are averages, not guarantees, and can vary by employer, union status, and Ontario region.'
    },
    wages_by_province: input.wagesByProvince.map((item) => ({
      province: item.province,
      low_hourly_cad: item.low,
      median_hourly_cad: item.median,
      high_hourly_cad: item.high,
      source: item.source
    })),
    difficulty: {
      overall_1_5: input.difficulty.overall,
      why: input.difficulty.why,
      common_failure_points: input.difficulty.commonFailurePoints
    },
    skills: {
      core: input.skills.core,
      tools_tech: input.skills.toolsTech,
      soft_skills: input.skills.softSkills
    },
    resources: {
      official: input.resources.official,
      training: input.resources.training,
      job_search: input.resources.jobSearch
    },
    sources: input.sources.map((item) => ({
      title: item.title,
      url: item.url,
      publisher: item.publisher,
      accessed_at: item.accessedAt
    }))
  })
}

export const BUILT_IN_CAREER_PATHWAY_PROFILES: CareerPathwayProfile[] = [
  buildOntarioProfile({
    title: 'Electrician (Construction and Maintenance) (309A) - Ontario',
    slug: 'electrician-construction-maintenance-309a-on',
    noc: '72200',
    tradeCode: '309A',
    teer: 2,
    pathwayType: 'trade_apprenticeship',
    regulated: true,
    oneLiner:
      'Install, maintain, troubleshoot, and repair electrical systems while meeting code and safety standards in Ontario.',
    whatYouDo: [
      'Run and terminate wire or conduit, and install panels, devices, lighting, and controls.',
      'Test and diagnose faults, verify compliance with code, and document work.'
    ],
    whoHires: ['Electrical contractors', 'Facilities teams', 'Union contractors (IBEW)'],
    entryPath: {
      pathName: 'Ontario apprenticeship route',
      whoItsFor:
        'People starting from zero or coming from adjacent hands-on work such as construction, maintenance, HVAC, or kitchen operations.',
      steps: [
        'Get hired by a sponsor employer such as a contractor or union shop.',
        'Register an apprenticeship agreement in Ontario.',
        'Accumulate required on-the-job hours and complete in-school training levels.',
        'Write the certifying exam to receive the Certificate of Qualification.'
      ],
      timeToFirstJobWeeks: { min: 2, max: 16 }
    },
    requirements: {
      mustHave: [
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
          details: 'Passing leads to the Certificate of Qualification.'
        }
      ],
      niceToHave: [
        {
          type: 'health_safety',
          name: 'WHMIS or Working at Heights',
          details: 'Common site requirements that improve hireability.'
        },
        {
          type: 'health_safety',
          name: 'First Aid / CPR',
          details: 'Often requested on job sites.'
        }
      ],
      toolsOrGear: ['Basic hand tools', 'PPE (site-dependent)', 'Meters and testing tools']
    },
    timeline: {
      employableWeeks: { min: 2, max: 16 },
      fullQualificationMonths: { min: 48, max: 72 },
      phases: [
        {
          phase: 'Start',
          durationWeeks: { min: 2, max: 12 },
          milestones: [
            { title: 'Get sponsor employer', doneWhen: 'You have an offer as an apprentice or helper.' },
            { title: 'Register apprenticeship', doneWhen: 'Your training agreement is active.' }
          ]
        },
        {
          phase: 'Training',
          durationWeeks: { min: 156, max: 312 },
          milestones: [
            {
              title: 'Accumulate on-the-job hours',
              doneWhen: 'You complete the program hours target, often cited as about 9,000 hours.'
            },
            {
              title: 'Complete in-school levels',
              doneWhen: 'All required levels are complete, including the 309A-specific level.'
            }
          ]
        },
        {
          phase: 'Credentialing',
          durationWeeks: { min: 2, max: 12 },
          milestones: [
            {
              title: 'Write the Certificate of Qualification / Red Seal exam',
              doneWhen: 'You pass the certifying exam and receive your qualification.'
            }
          ]
        }
      ]
    },
    progression: [
      {
        level: 'Entry',
        title: 'Apprentice Electrician',
        typicalTime: '0-5 years',
        whatChanges: ['Hours accumulate', 'Responsibility increases', 'School levels completed']
      },
      {
        level: 'Qualified',
        title: 'Journeyperson',
        typicalTime: 'After exam',
        whatChanges: ['Can work as a certified journeyperson', 'Higher wage ceiling']
      },
      {
        level: 'Advanced',
        title: 'Red Seal endorsed',
        typicalTime: 'After interprovincial exam',
        whatChanges: ['Mobility across Canada', 'Stronger hiring signal']
      }
    ],
    wagesByProvince: [
      { province: 'ON', low: 22, median: 36, high: 55, source: 'Job Bank / Ontario average' }
    ],
    difficulty: {
      overall: 4,
      why: ['Getting a sponsor is the bottleneck.', 'The path takes years because it combines hours and school.'],
      commonFailurePoints: [
        'No sponsor employer secured early enough.',
        'Hours are inconsistent and not tracked cleanly.',
        'Exam preparation is left too late.'
      ]
    },
    skills: {
      core: ['Electrical fundamentals', 'Code literacy', 'Troubleshooting'],
      toolsTech: ['Meters and testing tools', 'Conduit and wiring', 'Panels and devices'],
      softSkills: ['Safety discipline', 'Communication on job sites', 'Documentation']
    },
    resources: {
      official: [
        {
          title: 'Skilled Trades Ontario - Electrician (Construction and Maintenance)',
          url: 'https://www.skilledtradesontario.ca/trade-information/electrician-construction-and-maintenance/'
        },
        { title: 'Red Seal program information', url: 'https://www.red-seal.ca/eng/welcome.shtml' }
      ],
      training: [
        {
          title: 'Electrical Trades curriculum (levels and hours structure)',
          url: 'https://www.skilledtradesontario.ca/wp-content/uploads/1970/01/Electrical-Trades-309A-309C-442A-Curriculum-L1234-Dec-22-2023-EN.pdf'
        }
      ],
      jobSearch: [
        { title: 'Job Bank wage report (NOC 72200)', url: 'https://www.jobbank.gc.ca/wagereport/occupation/20684' }
      ]
    },
    sources: [
      {
        title: 'Skilled Trades Ontario trade page (309A)',
        url: 'https://www.skilledtradesontario.ca/trade-information/electrician-construction-and-maintenance/',
        publisher: 'Skilled Trades Ontario',
        accessedAt: '2026-03-03'
      },
      {
        title: 'Electrical Trades curriculum',
        url: 'https://www.skilledtradesontario.ca/wp-content/uploads/1970/01/Electrical-Trades-309A-309C-442A-Curriculum-L1234-Dec-22-2023-EN.pdf',
        publisher: 'Skilled Trades Ontario',
        accessedAt: '2026-03-03'
      }
    ]
  }),
  buildOntarioProfile({
    title: 'Plumber - Ontario',
    slug: 'plumber-on',
    noc: '72300',
    tradeCode: '306A',
    teer: 2,
    pathwayType: 'trade_apprenticeship',
    regulated: true,
    oneLiner:
      'Install, repair, and maintain water, drainage, and piping systems in residential, commercial, and industrial settings.',
    whatYouDo: [
      'Install and service piping, fixtures, valves, and drainage systems.',
      'Read plans, troubleshoot problems, and complete code-compliant repairs.'
    ],
    whoHires: ['Plumbing contractors', 'Construction firms', 'Facilities teams'],
    entryPath: {
      pathName: 'Ontario apprenticeship route',
      whoItsFor: 'People entering plumbing directly or coming from construction, maintenance, or service work.',
      steps: [
        'Get hired by a sponsor employer.',
        'Register the apprenticeship agreement.',
        'Accumulate supervised hours and in-school training.',
        'Write the certifying exam to qualify.'
      ],
      timeToFirstJobWeeks: { min: 2, max: 16 }
    },
    requirements: {
      mustHave: [
        { type: 'legal', name: 'Registered apprenticeship with sponsor', details: 'Applies in Ontario.' },
        { type: 'training', name: 'In-school trade training', details: 'Delivered in blocks during the apprenticeship.' },
        { type: 'exam', name: 'Certificate of Qualification exam', details: 'Needed for full qualification.' }
      ],
      niceToHave: [
        { type: 'health_safety', name: 'WHMIS', details: 'Often requested on job sites.' },
        { type: 'health_safety', name: 'Working at Heights', details: 'Helpful for mixed construction work.' }
      ],
      toolsOrGear: ['Basic hand tools', 'PPE', 'Measuring tools']
    },
    timeline: {
      employableWeeks: { min: 2, max: 16 },
      fullQualificationMonths: { min: 48, max: 72 },
      phases: [
        {
          phase: 'Start',
          durationWeeks: { min: 2, max: 12 },
          milestones: [
            { title: 'Get sponsor employer', doneWhen: 'You have an entry offer.' },
            { title: 'Register apprenticeship', doneWhen: 'Registration is active.' }
          ]
        },
        {
          phase: 'Training',
          durationWeeks: { min: 156, max: 312 },
          milestones: [
            { title: 'Log apprenticeship hours', doneWhen: 'Your required hours are on track.' },
            { title: 'Complete school blocks', doneWhen: 'All trade school blocks are complete.' }
          ]
        },
        {
          phase: 'Credentialing',
          durationWeeks: { min: 2, max: 12 },
          milestones: [
            { title: 'Write qualifying exam', doneWhen: 'You pass the certifying exam.' }
          ]
        }
      ]
    },
    progression: [
      {
        level: 'Entry',
        title: 'Apprentice Plumber',
        typicalTime: '0-5 years',
        whatChanges: ['Hours accumulate', 'Scope expands', 'Independent work increases']
      },
      {
        level: 'Qualified',
        title: 'Journeyperson Plumber',
        typicalTime: 'After exam',
        whatChanges: ['Higher wage ceiling', 'More independent service and install work']
      }
    ],
    wagesByProvince: [
      { province: 'ON', low: 22, median: 35, high: 50, source: 'Job Bank / Ontario average' }
    ],
    difficulty: {
      overall: 4,
      why: ['You still need a sponsor and hours.', 'The path combines work, school, and an exam.'],
      commonFailurePoints: ['No sponsor', 'Weak math / measurement basics', 'Poor hour tracking']
    },
    skills: {
      core: ['Blueprint reading', 'Measurement', 'Troubleshooting'],
      toolsTech: ['Pipe tools', 'Cutting and fitting', 'Basic testing'],
      softSkills: ['Safety discipline', 'Reliability', 'Customer communication']
    },
    resources: {
      official: [{ title: 'Skilled Trades Ontario - trade information', url: 'https://www.skilledtradesontario.ca/' }],
      training: [{ title: 'Ontario apprenticeship information', url: 'https://www.skilledtradesontario.ca/apprenticeship/' }],
      jobSearch: [{ title: 'Job Bank wage data', url: 'https://www.jobbank.gc.ca/' }]
    },
    sources: [
      {
        title: 'Skilled Trades Ontario',
        url: 'https://www.skilledtradesontario.ca/',
        publisher: 'Skilled Trades Ontario',
        accessedAt: '2026-03-03'
      }
    ]
  }),
  buildOntarioProfile({
    title: 'HVAC Technician - Ontario',
    slug: 'hvac-technician-on',
    noc: '72402',
    tradeCode: '313D',
    teer: 2,
    pathwayType: 'trade_apprenticeship',
    regulated: true,
    oneLiner:
      'Install, maintain, and repair heating, ventilation, and air-conditioning systems in Ontario.',
    whatYouDo: [
      'Install and service residential and commercial HVAC equipment.',
      'Troubleshoot system faults, controls, and airflow problems.'
    ],
    whoHires: ['HVAC contractors', 'Mechanical contractors', 'Facilities and service teams'],
    entryPath: {
      pathName: 'Ontario apprenticeship or helper route',
      whoItsFor: 'People entering through service, maintenance, warehouse, or construction-adjacent backgrounds.',
      steps: [
        'Get hired as a helper, trainee, or sponsor-backed apprentice.',
        'Register the apprenticeship when applicable.',
        'Build supervised hours and complete school or manufacturer training.',
        'Advance into more complex service calls and certification milestones.'
      ],
      timeToFirstJobWeeks: { min: 2, max: 12 }
    },
    requirements: {
      mustHave: [
        { type: 'training', name: 'Mechanical and electrical basics', details: 'Needed before independent field work.' },
        { type: 'legal', name: 'Employer or sponsor pathway', details: 'Common route into the trade in Ontario.' },
        { type: 'certification', name: 'Refrigeration / gas tickets as required', details: 'Can vary by employer and equipment.' }
      ],
      niceToHave: [
        { type: 'health_safety', name: 'Working at Heights', details: 'Often useful on job sites.' },
        { type: 'health_safety', name: 'WHMIS', details: 'Common baseline site credential.' }
      ],
      toolsOrGear: ['Basic hand tools', 'Meters', 'PPE']
    },
    timeline: {
      employableWeeks: { min: 2, max: 12 },
      fullQualificationMonths: { min: 24, max: 60 },
      phases: [
        {
          phase: 'Start',
          durationWeeks: { min: 2, max: 10 },
          milestones: [
            { title: 'Land entry HVAC role', doneWhen: 'You have a helper, trainee, or apprentice offer.' },
            { title: 'Map required tickets', doneWhen: 'You know which tickets your employer path expects first.' }
          ]
        },
        {
          phase: 'Training',
          durationWeeks: { min: 26, max: 156 },
          milestones: [
            { title: 'Build service hours', doneWhen: 'You can document field hours and real service tasks.' },
            { title: 'Complete core training', doneWhen: 'You have the first meaningful training block or ticket complete.' }
          ]
        },
        {
          phase: 'Credentialing',
          durationWeeks: { min: 4, max: 26 },
          milestones: [
            { title: 'Add required tickets', doneWhen: 'You hold the certs your target employers filter for first.' }
          ]
        }
      ]
    },
    progression: [
      {
        level: 'Entry',
        title: 'HVAC Helper / Apprentice',
        typicalTime: '0-3 years',
        whatChanges: ['Basic installs and maintenance', 'Assisted service calls']
      },
      {
        level: 'Mid',
        title: 'Service Technician',
        typicalTime: '2-5 years',
        whatChanges: ['More independent troubleshooting', 'Higher-value service work']
      }
    ],
    wagesByProvince: [
      { province: 'ON', low: 22, median: 34, high: 48, source: 'Job Bank / Ontario average' }
    ],
    difficulty: {
      overall: 4,
      why: ['Employers screen for field-ready basics quickly.', 'Tickets and specialization can affect pay fast.'],
      commonFailurePoints: ['No employer path', 'Weak troubleshooting basics', 'Missing early tickets']
    },
    skills: {
      core: ['Mechanical troubleshooting', 'Electrical basics', 'Documentation'],
      toolsTech: ['Meters', 'Hand tools', 'Controls familiarity'],
      softSkills: ['Reliability', 'Customer communication', 'Safety discipline']
    },
    resources: {
      official: [{ title: 'Skilled Trades Ontario', url: 'https://www.skilledtradesontario.ca/' }],
      training: [{ title: 'Ontario apprenticeship information', url: 'https://www.skilledtradesontario.ca/apprenticeship/' }],
      jobSearch: [{ title: 'Job Bank wage data', url: 'https://www.jobbank.gc.ca/' }]
    },
    sources: [
      {
        title: 'Skilled Trades Ontario',
        url: 'https://www.skilledtradesontario.ca/',
        publisher: 'Skilled Trades Ontario',
        accessedAt: '2026-03-03'
      }
    ]
  }),
  buildOntarioProfile({
    title: 'Registered Nurse (RN) - Ontario',
    slug: 'registered-nurse-on',
    noc: '31301',
    teer: 1,
    pathwayType: 'regulated_profession',
    regulated: true,
    oneLiner:
      'Assess, plan, implement, and evaluate patient care in hospitals, clinics, long-term care, and community settings.',
    whatYouDo: [
      'Provide direct patient care and clinical documentation.',
      'Coordinate with physicians, teams, and families while maintaining safe practice standards.'
    ],
    whoHires: ['Hospitals', 'Long-term care homes', 'Community health providers'],
    entryPath: {
      pathName: 'Ontario nursing education plus licensure route',
      whoItsFor: 'People pursuing the full RN route in Ontario, including career changers who need a clear regulated path.',
      steps: [
        'Confirm education prerequisites and admissions route.',
        'Complete an approved nursing degree path.',
        'Meet CNO registration requirements and write the required exam.',
        'Apply into RN roles once registration is active.'
      ],
      timeToFirstJobWeeks: { min: 52, max: 260 }
    },
    requirements: {
      mustHave: [
        { type: 'education', name: 'Approved nursing education pathway', details: 'Degree and admissions path depend on your starting point.' },
        { type: 'legal', name: 'CNO registration requirements', details: 'Ontario nursing is regulated.' },
        { type: 'exam', name: 'Required registration exam', details: 'Exam and registration sequence must be completed.' }
      ],
      niceToHave: [
        { type: 'health_safety', name: 'BLS / CPR', details: 'Common baseline requirement.' }
      ],
      toolsOrGear: ['Clinical placement readiness', 'Documentation systems familiarity']
    },
    timeline: {
      employableWeeks: { min: 52, max: 260 },
      fullQualificationMonths: { min: 24, max: 60 },
      phases: [
        {
          phase: 'Start',
          durationWeeks: { min: 4, max: 16 },
          milestones: [
            { title: 'Confirm prerequisites', doneWhen: 'You know the exact Ontario admissions and registration sequence.' },
            { title: 'Choose education route', doneWhen: 'You have a realistic school pathway and budget.' }
          ]
        },
        {
          phase: 'Training',
          durationWeeks: { min: 52, max: 208 },
          milestones: [
            { title: 'Complete core nursing education', doneWhen: 'You complete the main education requirement.' },
            { title: 'Complete placements', doneWhen: 'You have the clinical experience required for the route.' }
          ]
        },
        {
          phase: 'Credentialing',
          durationWeeks: { min: 2, max: 16 },
          milestones: [
            { title: 'Finish registration and exam', doneWhen: 'Your registration is active and you can apply as an RN.' }
          ]
        }
      ]
    },
    progression: [
      {
        level: 'Entry',
        title: 'Registered Nurse',
        typicalTime: 'At entry to practice',
        whatChanges: ['Practice under RN scope', 'Specialties open over time']
      },
      {
        level: 'Advanced',
        title: 'Specialized RN roles',
        typicalTime: 'After 2-5 years',
        whatChanges: ['Higher specialization', 'Leadership or advanced practice paths']
      }
    ],
    wagesByProvince: [
      { province: 'ON', low: 34, median: 43, high: 55, source: 'Job Bank / Ontario average' }
    ],
    difficulty: {
      overall: 5,
      why: ['It is a regulated profession with a real education gate.', 'The path depends on admissions, clinical training, and licensure.'],
      commonFailurePoints: ['Underestimating education time', 'Weak prerequisite planning', 'Not mapping registration early']
    },
    skills: {
      core: ['Clinical judgment', 'Documentation', 'Patient care planning'],
      toolsTech: ['Clinical systems', 'Medication safety', 'Assessment workflow'],
      softSkills: ['Calm communication', 'Attention to detail', 'Team coordination']
    },
    resources: {
      official: [{ title: 'College of Nurses of Ontario', url: 'https://www.cno.org/' }],
      training: [{ title: 'Ontario nursing programs (search)', url: 'https://www.ontariocolleges.ca/' }],
      jobSearch: [{ title: 'Job Bank wage data', url: 'https://www.jobbank.gc.ca/' }]
    },
    sources: [
      {
        title: 'College of Nurses of Ontario',
        url: 'https://www.cno.org/',
        publisher: 'College of Nurses of Ontario',
        accessedAt: '2026-03-03'
      }
    ]
  }),
  buildOntarioProfile({
    title: 'AZ Truck Driver - Ontario',
    slug: 'az-truck-driver-on',
    noc: '73300',
    teer: 3,
    pathwayType: 'credential_stack',
    regulated: false,
    oneLiner:
      'Operate tractor-trailers and heavy commercial vehicles for regional and long-haul freight in Ontario.',
    whatYouDo: [
      'Drive commercial equipment safely and legally.',
      'Handle inspections, trip planning, paperwork, and customer or dispatcher communication.'
    ],
    whoHires: ['Freight carriers', 'Logistics fleets', 'Construction and industrial transport employers'],
    entryPath: {
      pathName: 'Licence-first entry route',
      whoItsFor: 'People starting fresh who need the Ontario AZ licence and a credible first employer path.',
      steps: [
        'Confirm Ontario AZ licensing requirements and medical standard.',
        'Complete approved training and testing steps.',
        'Add any entry employer requirements such as abstract or border-ready paperwork.',
        'Apply to fleets that hire newer AZ drivers.'
      ],
      timeToFirstJobWeeks: { min: 4, max: 16 }
    },
    requirements: {
      mustHave: [
        { type: 'legal', name: 'Ontario AZ licence', details: 'Primary gate into heavy commercial driving.' },
        { type: 'legal', name: 'Medical and driving eligibility', details: 'Required to stay road-legal.' }
      ],
      niceToHave: [
        { type: 'certification', name: 'Clean abstract and safety record', details: 'Improves early hireability.' },
        { type: 'experience', name: 'Yard, dock, or delivery experience', details: 'Can help with the first fleet role.' }
      ],
      toolsOrGear: ['Trip planning habits', 'Inspection checklists', 'Dispatch communication']
    },
    timeline: {
      employableWeeks: { min: 4, max: 16 },
      fullQualificationMonths: { min: 2, max: 12 },
      phases: [
        {
          phase: 'Start',
          durationWeeks: { min: 1, max: 4 },
          milestones: [
            { title: 'Confirm AZ route', doneWhen: 'You know the licence, training, and testing steps.' },
            { title: 'Choose training path', doneWhen: 'You have a budget and training plan.' }
          ]
        },
        {
          phase: 'Training',
          durationWeeks: { min: 2, max: 12 },
          milestones: [
            { title: 'Complete licence training', doneWhen: 'You complete the core training and testing path.' },
            { title: 'Prepare for employer screening', doneWhen: 'You have the documents and clean record employers ask for first.' }
          ]
        },
        {
          phase: 'Credentialing',
          durationWeeks: { min: 1, max: 4 },
          milestones: [
            { title: 'Land first fleet interview', doneWhen: 'You are interviewing for AZ-ready roles.' }
          ]
        }
      ]
    },
    progression: [
      {
        level: 'Entry',
        title: 'New AZ Driver',
        typicalTime: '0-12 months',
        whatChanges: ['Local and regional opportunities open first', 'Insurance and employer trust matter']
      },
      {
        level: 'Mid',
        title: 'Experienced AZ Driver',
        typicalTime: 'After 1-3 years',
        whatChanges: ['Higher-paying runs', 'Specialized or long-haul options']
      }
    ],
    wagesByProvince: [
      { province: 'ON', low: 24, median: 31, high: 40, source: 'Job Bank / Ontario average' }
    ],
    difficulty: {
      overall: 3,
      why: ['The main gate is the licence path.', 'Entry hireability improves quickly once the licence and record are in place.'],
      commonFailurePoints: ['Underestimating training cost', 'Weak driving record', 'Applying before the licence path is complete']
    },
    skills: {
      core: ['Safe driving discipline', 'Trip planning', 'Documentation'],
      toolsTech: ['Inspections', 'Logbooks or ELD familiarity', 'Dispatch tools'],
      softSkills: ['Reliability', 'Time management', 'Clear communication']
    },
    resources: {
      official: [{ title: 'Ontario commercial driver information', url: 'https://www.ontario.ca/' }],
      training: [{ title: 'Ontario-approved training providers', url: 'https://www.ontario.ca/' }],
      jobSearch: [{ title: 'Job Bank wage data', url: 'https://www.jobbank.gc.ca/' }]
    },
    sources: [
      {
        title: 'Ontario government commercial driver information',
        url: 'https://www.ontario.ca/',
        publisher: 'Government of Ontario',
        accessedAt: '2026-03-03'
      }
    ]
  })
]
