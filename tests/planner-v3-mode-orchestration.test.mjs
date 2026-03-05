import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const plannerClientPath = path.resolve(
  __dirname,
  '../app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx'
)
const dashboardComponentPath = path.resolve(
  __dirname,
  '../components/career-switch-planner/PlannerDashboardV3.tsx'
)
const intakeComponentPath = path.resolve(
  __dirname,
  '../components/career-switch-planner/PlannerIntakeWizard.tsx'
)

const plannerClientSource = readFileSync(plannerClientPath, 'utf8')
const dashboardSource = readFileSync(dashboardComponentPath, 'utf8')
const intakeSource = readFileSync(intakeComponentPath, 'utf8')

test('planner client wires V3 mode orchestration and edit drawer', () => {
  assert.match(plannerClientSource, /const \[viewMode, setViewMode\]/)
  assert.match(plannerClientSource, /const \[isEditDrawerOpen, setIsEditDrawerOpen\]/)
  assert.match(plannerClientSource, /PlannerIntakeWizard/)
  assert.match(plannerClientSource, /PlannerDashboardV3/)
  assert.match(plannerClientSource, /setViewMode\('dashboard'\)/)
  assert.match(plannerClientSource, /setViewMode\('intake'\)/)
  assert.match(plannerClientSource, /const showDashboard = plannerState !== 'loading' && viewMode === 'dashboard' && hasPlannerResults/)
  assert.doesNotMatch(plannerClientSource, /NEXT_PUBLIC_PLANNER_V3_ENABLED/)
  assert.doesNotMatch(plannerClientSource, /if \(plannerV3Enabled\)/)
})

test('dashboard component includes required control actions and stale warning text', () => {
  assert.match(dashboardSource, /Input Summary/)
  assert.match(dashboardSource, /Edit Inputs/)
  assert.match(dashboardSource, /Regenerate with Changes/)
  assert.match(dashboardSource, /Start New Plan/)
  assert.match(dashboardSource, /This report is from previous inputs\./)
  assert.match(dashboardSource, /Sticky Action Panel/)
  assert.match(dashboardSource, /Preview Limit/)
  assert.match(dashboardSource, /Sign In to Unlock Full Report/)
})

test('intake component keeps 3-step flow controls and step-3 generation gating', () => {
  assert.match(intakeSource, /activeWizardStep \+ 1/)
  assert.match(intakeSource, /Step 1 of 3|Step 2 of 3|Step 3 of 3|wizardSteps/)
  assert.doesNotMatch(intakeSource, /Go to Step 3 to Generate Preview/)
  assert.match(intakeSource, /activeWizardStep === 2/)
  assert.match(intakeSource, /Resume Upload \(Pro\)/)
})

test('planner client supports guest generation copy and guest preview state wiring', () => {
  assert.match(plannerClientSource, /Generate Preview/)
  assert.match(plannerClientSource, /Regenerate Preview/)
  assert.match(plannerClientSource, /setIsGuestPreview\(Boolean\(data\?\.previewLimited/)
})
