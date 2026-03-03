import { buildRecommendedTargetSections } from '@/lib/planner/recommendedTargets'

const sections = buildRecommendedTargetSections({
  careers: [
    {
      occupationId: '35-1011',
      title: 'Chefs and Head Cooks',
      score: 95,
      difficulty: 'moderate',
      transitionTime: '1-3 months',
      topReasons: ['This is your current occupation family.']
    },
    {
      occupationId: '47-2111',
      title: 'Electricians',
      score: 82,
      difficulty: 'hard',
      transitionTime: '3-6 months',
      topReasons: ['Strong hands-on and safety overlap.']
    },
    {
      occupationId: '49-9021',
      title: 'HVAC Technicians',
      score: 76,
      difficulty: 'hard',
      transitionTime: '3-6 months',
      topReasons: ['Another skilled trade with transferable pace and reliability.']
    }
  ],
  currentRoleInput: 'Sous Chef',
  currentRoleCode: '35-1011',
  targetRoleInput: 'Electrician',
  targetRoleCode: '47-2111',
  currentAlternatives: [{ title: 'Kitchen Manager', code: '35-1011' }]
})

const allTitles = sections.flatMap((section) => section.roles.map((role) => role.title))

if (allTitles.some((title) => /chefs and head cooks/i.test(title))) {
  console.error('FAIL: recommended targets still include the current occupation.')
  process.exit(1)
}

if (allTitles.some((title) => /electricians?/i.test(title))) {
  console.error('FAIL: recommended targets still include the active target occupation.')
  process.exit(1)
}

if (allTitles.length < 3) {
  console.error('FAIL: expected at least 3 distinct recommended targets.')
  process.exit(1)
}

console.log(`PASS: recommended targets exclude current/target roles (${allTitles.join(', ')})`)
