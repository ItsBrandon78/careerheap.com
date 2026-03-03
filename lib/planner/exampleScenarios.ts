export type PlannerExampleScenario = {
  id: string
  currentRole: string
  targetRole: string
  summary: string
  experienceText: string
  skills: string[]
  workRegion: 'us' | 'ca' | 'remote-us' | 'remote-ca' | 'either'
  locationText: string
  timelineBucket: 'immediate' | '1-3 months' | '3-6 months' | '6-12+ months'
  educationLevel:
    | 'No formal degree'
    | 'High school'
    | 'Trade certification'
    | 'Apprenticeship'
    | "Associate's"
    | "Bachelor's"
    | "Master's"
    | 'Doctorate'
    | 'Self-taught / portfolio-based'
  incomeTarget: 'Under $50k' | '$50-75k' | '$75-100k' | '$100k+' | '$150k+' | 'Not sure'
}

export const PLANNER_EXAMPLE_SCENARIOS: PlannerExampleScenario[] = [
  {
    id: 'warehouse-hvac',
    currentRole: 'Warehouse Associate',
    targetRole: 'HVAC Technician',
    summary: 'Turns physical reliability and safe material handling into a regulated trade pathway.',
    experienceText:
      '5 years moving freight, using forklifts, handling inventory counts, and keeping shift targets on time in a fast warehouse.',
    skills: ['Safe material handling', 'Inventory accuracy', 'Shift reliability'],
    workRegion: 'us',
    locationText: 'Cleveland, Ohio, United States',
    timelineBucket: '3-6 months',
    educationLevel: 'High school',
    incomeTarget: '$50-75k'
  },
  {
    id: 'cook-electrician',
    currentRole: 'Line Cook',
    targetRole: 'Apprentice Electrician',
    summary: 'Uses stamina, SOP discipline, and fast hand-work as a trade entry point.',
    experienceText:
      '7 years in busy kitchens, following food-safety procedures, training juniors, and keeping calm during rush periods.',
    skills: ['Safety compliance', 'Teamwork', 'Fast-paced execution'],
    workRegion: 'ca',
    locationText: 'Toronto, Ontario, Canada',
    timelineBucket: '3-6 months',
    educationLevel: 'High school',
    incomeTarget: '$50-75k'
  },
  {
    id: 'landscaper-plumber',
    currentRole: 'Landscaper',
    targetRole: 'Plumber Apprentice',
    summary: 'Shifts field stamina and jobsite discipline into another regulated trade route.',
    experienceText:
      '4 years doing outdoor physical work, using tools, following crew plans, and showing up for early starts in all weather.',
    skills: ['Physical stamina', 'Crew coordination', 'Tool handling'],
    workRegion: 'us',
    locationText: 'Columbus, Ohio, United States',
    timelineBucket: '3-6 months',
    educationLevel: 'High school',
    incomeTarget: '$50-75k'
  },
  {
    id: 'admin-hr',
    currentRole: 'Administrative Assistant',
    targetRole: 'HR Coordinator',
    summary: 'Builds on documentation, scheduling, and stakeholder coordination for a ladder move.',
    experienceText:
      '6 years managing calendars, onboarding paperwork, interview scheduling, and cross-team communications for a regional office.',
    skills: ['Documentation', 'Scheduling', 'Cross-team coordination'],
    workRegion: 'us',
    locationText: 'Chicago, Illinois, United States',
    timelineBucket: '1-3 months',
    educationLevel: "Bachelor's",
    incomeTarget: '$50-75k'
  },
  {
    id: 'sales-account-manager',
    currentRole: 'Sales Representative',
    targetRole: 'Account Manager',
    summary: 'Turns customer-facing wins into a higher-scope client ownership path.',
    experienceText:
      '5 years selling B2B services, managing renewals, handling objections, and keeping client relationships warm after the sale.',
    skills: ['Client communication', 'Upselling', 'Pipeline management'],
    workRegion: 'us',
    locationText: 'Dallas, Texas, United States',
    timelineBucket: '1-3 months',
    educationLevel: "Bachelor's",
    incomeTarget: '$75-100k'
  },
  {
    id: 'support-junior-dev',
    currentRole: 'Technical Support Specialist',
    targetRole: 'Junior Software Developer',
    summary: 'Uses troubleshooting and system familiarity to pivot into a portfolio-heavy tech path.',
    experienceText:
      '3 years supporting SaaS users, debugging issues, documenting bugs, and working with engineering on escalations.',
    skills: ['Troubleshooting', 'Documentation', 'Customer communication'],
    workRegion: 'remote-us',
    locationText: 'Remote (US)',
    timelineBucket: '3-6 months',
    educationLevel: 'Self-taught / portfolio-based',
    incomeTarget: '$75-100k'
  },
  {
    id: 'analyst-data-scientist',
    currentRole: 'Junior Analyst',
    targetRole: 'Data Scientist',
    summary: 'Builds on data handling and reporting while adding modeling proof and a credential path.',
    experienceText:
      '2 years building dashboards, cleaning spreadsheets, writing SQL queries, and presenting weekly reporting to managers.',
    skills: ['SQL', 'Reporting', 'Data analysis'],
    workRegion: 'us',
    locationText: 'New York, New York, United States',
    timelineBucket: '3-6 months',
    educationLevel: "Bachelor's",
    incomeTarget: '$100k+'
  },
  {
    id: 'server-cna',
    currentRole: 'Server',
    targetRole: 'CNA',
    summary: 'Converts pace, people skills, and stamina into a faster-entry healthcare support role.',
    experienceText:
      '6 years in hospitality, handling high guest volume, staying calm under pressure, and working long shifts on my feet.',
    skills: ['Customer care', 'Physical stamina', 'Teamwork'],
    workRegion: 'us',
    locationText: 'Nashville, Tennessee, United States',
    timelineBucket: '1-3 months',
    educationLevel: 'High school',
    incomeTarget: '$50-75k'
  },
  {
    id: 'teacher-nurse',
    currentRole: 'Teacher',
    targetRole: 'Nurse',
    summary: 'Maps structured care, communication, and composure into a regulated profession path.',
    experienceText:
      '8 years leading classrooms, managing documentation, communicating with families, and staying organized during high-stress days.',
    skills: ['Communication', 'Documentation', 'Calm under pressure'],
    workRegion: 'us',
    locationText: 'Atlanta, Georgia, United States',
    timelineBucket: '6-12+ months',
    educationLevel: "Bachelor's",
    incomeTarget: '$75-100k'
  },
  {
    id: 'retail-ux',
    currentRole: 'Retail Associate',
    targetRole: 'UX Designer',
    summary: 'Reframes customer insight and observation into a portfolio-led design transition.',
    experienceText:
      '4 years on a retail floor, observing buyer behavior, resolving friction, and giving feedback on merchandising and checkout flow.',
    skills: ['Customer insight', 'Observation', 'Communication'],
    workRegion: 'us',
    locationText: 'Austin, Texas, United States',
    timelineBucket: '3-6 months',
    educationLevel: 'Self-taught / portfolio-based',
    incomeTarget: '$75-100k'
  },
  {
    id: 'photographer-social',
    currentRole: 'Photographer',
    targetRole: 'Social Media Manager',
    summary: 'Uses content production and audience instincts for a portfolio + experience ladder move.',
    experienceText:
      '5 years shooting events and products, editing assets, writing captions, and managing client approvals on tight deadlines.',
    skills: ['Content creation', 'Client communication', 'Visual storytelling'],
    workRegion: 'either',
    locationText: 'Open to either (US/CA)',
    timelineBucket: '1-3 months',
    educationLevel: 'Self-taught / portfolio-based',
    incomeTarget: '$50-75k'
  },
  {
    id: 'cashier-bookkeeper',
    currentRole: 'Cashier',
    targetRole: 'Bookkeeping Assistant',
    summary: 'Turns accuracy and customer-facing reliability into a structured finance support path.',
    experienceText:
      '4 years handling POS transactions, balancing tills, helping customers, and tracking daily cash discrepancies.',
    skills: ['Accuracy', 'Cash handling', 'Documentation'],
    workRegion: 'us',
    locationText: 'Phoenix, Arizona, United States',
    timelineBucket: '1-3 months',
    educationLevel: 'High school',
    incomeTarget: '$50-75k'
  },
  {
    id: 'dispatcher-ops',
    currentRole: 'Dispatcher',
    targetRole: 'Operations Coordinator',
    summary: 'Uses scheduling and issue triage to move into an experience-ladder operations role.',
    experienceText:
      '3 years coordinating routes, juggling schedule changes, tracking delays, and keeping crews updated in real time.',
    skills: ['Scheduling', 'Coordination', 'Problem solving'],
    workRegion: 'us',
    locationText: 'Charlotte, North Carolina, United States',
    timelineBucket: '1-3 months',
    educationLevel: "Associate's",
    incomeTarget: '$50-75k'
  }
]

export function pickRandomExampleScenarios(
  count = 3,
  source: PlannerExampleScenario[] = PLANNER_EXAMPLE_SCENARIOS
) {
  const pool = [...source]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }
  return pool.slice(0, Math.max(1, Math.min(count, pool.length)))
}

export function findExampleScenarioByIds(ids: string[]) {
  const wanted = new Set(ids)
  const matches = PLANNER_EXAMPLE_SCENARIOS.filter((item) => wanted.has(item.id))
  if (matches.length !== ids.length) return []
  return ids
    .map((id) => matches.find((item) => item.id === id))
    .filter((item): item is PlannerExampleScenario => Boolean(item))
}
