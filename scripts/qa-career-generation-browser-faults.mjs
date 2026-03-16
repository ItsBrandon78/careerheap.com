import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const TOOL_URL = `${BASE_URL}/tools/career-switch-planner?plan=pro&uses=0&qaUser=1`
const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'qa-fault-screenshots')
const REPORT_PATH = path.resolve(process.cwd(), 'artifacts', 'qa-career-browser-faults-report.json')

const CASES = [
  ['Cashier', 'Licensed Practical Nurse'],
  ['Cashier', 'Accountant'],
  ['Cashier', 'Human Resources Manager'],
  ['Cashier', 'Administrative Assistant'],
  ['Retail Associate', 'Cybersecurity Analyst'],
  ['Retail Associate', 'Project Coordinator'],
  ['Warehouse Associate', 'Business Analyst'],
  ['Customer Service Representative', 'Software QA Analyst'],
  ['Customer Service Representative', 'DevOps Engineer'],
  ['Customer Service Representative', 'HR Coordinator']
]

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function selectRole(input, value) {
  await input.fill(value)
  await input.press('ArrowDown').catch(() => {})
  await input.press('Enter').catch(() => {})
}

async function runCase(page, currentRole, targetRole, index) {
  const network = []
  const onResponse = (response) => {
    const url = response.url()
    if (
      url.includes('/api/tools/career-switch-planner') ||
      url.includes('/api/career-map/occupations')
    ) {
      network.push({
        url,
        status: response.status(),
        ok: response.ok()
      })
    }
  }

  page.on('response', onResponse)
  const startedAt = new Date().toISOString()
  const name = `${String(index + 1).padStart(2, '0')}-${slug(currentRole)}-to-${slug(targetRole)}`
  const screenshotPath = path.join(ARTIFACT_DIR, `${name}.png`)

  try {
    await page.goto(TOOL_URL, { waitUntil: 'networkidle', timeout: 60000 })

    const currentInput = page.getByPlaceholder('Type your current role')
    const targetInput = page.getByPlaceholder('Type your target role')
    await currentInput.waitFor({ timeout: 15000 })

    await selectRole(currentInput, currentRole)
    await selectRole(targetInput, targetRole)

    await page.getByRole('button', { name: 'Next', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Background', exact: true }).waitFor({ timeout: 15000 })

    await page
      .getByPlaceholder(
        'Example: Led onboarding for 12 teammates, reduced ramp time by 18%, and improved retention by 14%.'
      )
      .fill(`Testing transition from ${currentRole} to ${targetRole} with measurable weekly output and customer-facing experience.`)

    await page.getByRole('button', { name: 'Next', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Constraints', exact: true }).waitFor({ timeout: 15000 })

    await page.getByRole('button', { name: /Generate My Data-Backed Plan/i }).click()
    const generationResponse = await page
      .waitForResponse(
        (response) =>
          response.url().includes('/api/tools/career-switch-planner') &&
          response.request().method() === 'POST',
        { timeout: 90000 }
      )
      .catch(() => null)
    const generationStatus = generationResponse?.status() ?? null

    let resolvedStatus = 'unknown'
    if (generationStatus === 200) {
      const dashboardVisible = await page
        .getByText('Command Center', { exact: false })
        .waitFor({ timeout: 30000 })
        .then(() => true)
        .catch(() => false)
      resolvedStatus = dashboardVisible ? 'dashboard' : 'unknown'
    } else if (generationStatus === 409) {
      resolvedStatus = 'role_selection_required'
    } else if (generationStatus !== null) {
      resolvedStatus = 'error'
    }

    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      currentRole,
      targetRole,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: resolvedStatus,
      screenshotPath,
      network
    }
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
    return {
      currentRole,
      targetRole,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      screenshotPath,
      network
    }
  } finally {
    page.off('response', onResponse)
  }
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 2200 } })
  const page = await context.newPage()
  const results = []

  for (let i = 0; i < CASES.length; i += 1) {
    const [currentRole, targetRole] = CASES[i]
    console.log(`Running ${i + 1}/${CASES.length}: ${currentRole} -> ${targetRole}`)
    const result = await runCase(page, currentRole, targetRole, i)
    results.push(result)
  }

  await browser.close()

  const summary = {
    startedAt: results[0]?.startedAt ?? null,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: results.length,
    dashboard: results.filter((row) => row.status === 'dashboard').length,
    roleSelectionRequired: results.filter((row) => row.status === 'role_selection_required').length,
    errors: results.filter((row) => row.status === 'error').length,
    unknown: results.filter((row) => row.status === 'unknown').length
  }

  const payload = { summary, results }
  writeFileSync(REPORT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`Saved browser fault report: ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error('[qa-career-generation-browser-faults] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
