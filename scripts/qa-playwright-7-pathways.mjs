import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const TOOL_URL = `${BASE_URL}/tools/career-switch-planner?plan=pro&uses=0&qaUser=1`
const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'qa-playwright-7-pathways')
const REPORT_PATH = path.resolve(process.cwd(), 'artifacts', 'qa-playwright-7-pathways-report.json')

const CASES = [
  ['Cashier', 'Dental Hygienist', 'HEALTHCARE_LICENSED'],
  ['Cashier', 'Registered Nurse', 'HEALTHCARE_LICENSED'],
  ['Cashier', 'Pharmacy Technician', 'HEALTHCARE_LICENSED'],
  ['Retail Associate', 'Electrician', 'TRADES'],
  ['Retail Associate', 'UX Designer', 'TECH'],
  ['Retail Associate', 'Customer Success Manager', 'GENERAL'],
  ['Retail Associate', 'Project Coordinator', 'GENERAL']
]

const TRADE_LEAKAGE_TERMS = [
  'apprenticeship',
  'red seal',
  'certificate of qualification',
  'journeyperson',
  'sponsor employer',
  'union lane',
  'skilled trades ontario'
]

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function selectRole(input, value) {
  await input.fill(value)
  await input.press('ArrowDown').catch(() => {})
  await input.press('Enter').catch(() => {})
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function containsAny(text, phrases) {
  const normalized = normalize(text)
  return phrases.some((phrase) => normalized.includes(normalize(phrase)))
}

function matchedPhrases(text, phrases) {
  const normalized = normalize(text)
  return phrases.filter((phrase) => normalized.includes(normalize(phrase)))
}

function collectStringValues(node, output = []) {
  if (typeof node === 'string') {
    output.push(node)
    return output
  }
  if (Array.isArray(node)) {
    for (const item of node) collectStringValues(item, output)
    return output
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectStringValues(value, output)
    }
  }
  return output
}

async function runCase(page, currentRole, targetRole, expectedPathType, index) {
  const startedAt = new Date().toISOString()
  const runToken = Date.now().toString(36)
  const name = `${String(index + 1).padStart(2, '0')}-${slug(currentRole)}-to-${slug(targetRole)}`
  const screenshotPath = path.join(ARTIFACT_DIR, `${name}.png`)
  const payloadPath = path.join(ARTIFACT_DIR, `${name}.payload.json`)

  try {
    await page.goto(TOOL_URL, { waitUntil: 'networkidle', timeout: 90000 })

    const currentInput = page.getByPlaceholder('Type your current role')
    const targetInput = page.getByPlaceholder('Type your target role')
    await currentInput.waitFor({ timeout: 20000 })

    await selectRole(currentInput, currentRole)
    await selectRole(targetInput, targetRole)

    await page.getByRole('button', { name: 'Next', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Background', exact: true }).waitFor({ timeout: 20000 })

    await page
      .getByPlaceholder(
        'Example: Led onboarding for 12 teammates, reduced ramp time by 18%, and improved retention by 14%.'
      )
      .fill(
        `Testing transition from ${currentRole} to ${targetRole} with measurable weekly output and customer-facing experience. token:${runToken}`
      )

    await page.getByRole('button', { name: 'Next', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Constraints', exact: true }).waitFor({ timeout: 20000 })

    await page.getByRole('button', { name: /Generate My Data-Backed Plan/i }).click()

    const generationResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/tools/career-switch-planner') &&
        response.request().method() === 'POST',
      { timeout: 120000 }
    ).catch(() => null)

    const generationStatus = generationResponse?.status() ?? null
    let payload = null
    if (generationResponse) {
      payload = await generationResponse.json().catch(() => null)
      if (payload) {
        writeFileSync(payloadPath, JSON.stringify(payload, null, 2), 'utf8')
      }
    }

    let dashboardVisible = false
    if (generationStatus === 200) {
      dashboardVisible = await page.getByText('Command Center', { exact: false })
        .waitFor({ timeout: 45000 })
        .then(() => true)
        .catch(() => false)
    }

    const actualPathType = payload?.report?.transitionMode?.careerPathType ?? null
    const templateKey = payload?.report?.transitionMode?.templateKey ?? null

    const flattened = normalize(collectStringValues(payload?.report ?? {}).join(' '))
    const leakageMatches =
      expectedPathType !== 'TRADES' ? matchedPhrases(flattened, TRADE_LEAKAGE_TERMS) : []
    const hasTradeLeakage = leakageMatches.length > 0

    const roleResolution = payload?.report?.roleResolution?.target?.matched?.title ?? null

    const result = {
      currentRole,
      targetRole,
      expectedPathType,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: generationStatus,
      dashboardVisible,
      actualPathType,
      templateKey,
      roleResolution,
      pathTypePass: actualPathType === expectedPathType,
      templateBleedPass: !hasTradeLeakage,
      leakageMatches,
      overallPass: generationStatus === 200 && dashboardVisible && actualPathType === expectedPathType && !hasTradeLeakage,
      screenshotPath,
      payloadPath
    }

    await page.screenshot({ path: screenshotPath, fullPage: true })
    return result
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
    return {
      currentRole,
      targetRole,
      expectedPathType,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'error',
      dashboardVisible: false,
      actualPathType: null,
      templateKey: null,
      roleResolution: null,
      pathTypePass: false,
      templateBleedPass: false,
      overallPass: false,
      error: error instanceof Error ? error.message : String(error),
      screenshotPath
    }
  }
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 2400 } })
  const page = await context.newPage()

  const results = []
  for (let i = 0; i < CASES.length; i += 1) {
    const [currentRole, targetRole, expectedPathType] = CASES[i]
    console.log(`Running ${i + 1}/${CASES.length}: ${currentRole} -> ${targetRole}`)
    const result = await runCase(page, currentRole, targetRole, expectedPathType, i)
    results.push(result)
  }

  await browser.close()

  const summary = {
    baseUrl: BASE_URL,
    total: results.length,
    passed: results.filter((r) => r.overallPass).length,
    failed: results.filter((r) => !r.overallPass).length,
    routingFailures: results.filter((r) => !r.pathTypePass).length,
    bleedFailures: results.filter((r) => !r.templateBleedPass).length
  }

  const payload = { summary, results }
  writeFileSync(REPORT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`Saved report: ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error('[qa-playwright-7-pathways] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
