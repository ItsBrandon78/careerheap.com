import { spawn, type ChildProcess } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type Page } from 'playwright'

const PORT = 3211
const BASE_URL = `http://127.0.0.1:${PORT}`
const TOOL_URL = `${BASE_URL}/tools/career-switch-planner?plan=pro&uses=0&qaUser=1`
const REPORT_ID = 'qa-browser-report'

type ProgressPayload = {
  checkedTaskIds: Record<string, boolean>
  expandedPhaseIds: string[]
  completedTrainingIds: Record<string, boolean>
  outreachTracker: {
    sent: string
    replies: string
    positiveReplies: string
    nextFollowUpDate: string
  }
  updatedAt: string
}

const plannerFixture = {
  score: 64,
  explanation: 'This is a realistic Ontario trade transition if you secure a sponsor-ready entry route.',
  transferableSkills: ['Reliability', 'Safety awareness', 'Fast-paced coordination'],
  skillGaps: [
    {
      title: 'Electrical fundamentals',
      detail: 'You still need trade-specific baseline knowledge.',
      difficulty: 'medium'
    }
  ],
  roadmap: {
    '30': ['Confirm minimum trade-entry requirements in Ontario', 'Target sponsor-ready employers'],
    '60': ['Register apprenticeship once a sponsor is secured'],
    '90': ['Begin on-the-job hours and complete first training block']
  },
  resumeReframes: [
    {
      before: 'Managed kitchen service under pressure',
      after: 'Maintained safe, reliable workflow under time pressure with strong SOP discipline'
    }
  ],
  recommendedRoles: [
    {
      title: 'Electrical Helper',
      match: 72,
      reason: 'Closer entry route while you work toward apprenticeship registration'
    }
  ],
  reportId: REPORT_ID,
  previewLimited: false,
  usage: {
    plan: 'pro',
    isUnlimited: true,
    canUse: true,
    used: 0,
    limit: 3,
    usesRemaining: null,
    byTool: {}
  },
  report: {
    compatibilitySnapshot: {
      score: 64,
      band: 'moderate',
      breakdown: {
        skill_overlap: 52,
        experience_similarity: 38,
        education_alignment: 45,
        certification_gap: 28,
        timeline_feasibility: 61
      },
      topReasons: ['Ontario trade demand is strong', 'The entry route is sponsor-driven']
    },
    suggestedCareers: [
      {
        occupationId: 'electrician-309a',
        title: 'Electrician (309A)',
        score: 64,
        breakdown: {
          skill_overlap: 52,
          experience_similarity: 38,
          education_alignment: 45,
          certification_gap: 28,
          timeline_feasibility: 61
        },
        difficulty: 'moderate',
        transitionTime: '1-4 months',
        regulated: true,
        salary: {
          usd: null,
          native: {
            currency: 'CAD',
            low: 22,
            median: 36,
            high: 55,
            sourceName: 'Job Bank / Ontario average',
            sourceUrl: 'https://www.jobbank.gc.ca/',
            asOfDate: '2026-03-12',
            region: 'Ontario'
          },
          conversion: null
        },
        topReasons: ['Demand is high', 'Entry route is clear']
      }
    ],
    targetRequirements: {
      education: 'Secondary school',
      certifications: ['WHMIS', 'Working at Heights', 'Standard First Aid'],
      hardGates: ['Register apprenticeship once employer sponsorship is secured'],
      employerSignals: ['Licensing + certification'],
      apprenticeshipHours: 9000,
      examRequired: true,
      regulated: true,
      sources: [
        { label: 'Skilled Trades Ontario', url: 'https://www.skilledtradesontario.ca/' }
      ]
    },
    transitionSections: {
      transferableStrengths: [
        {
          id: 'strength-1',
          label: 'Reliability',
          requirement: 'Safety discipline',
          source: 'skills'
        }
      ],
      roadmapPlan: {
        zeroToTwoWeeks: [
          {
            id: 'zero-1',
            action: 'Confirm minimum trade-entry requirements in Ontario',
            tiedRequirement: 'Entry requirements'
          },
          {
            id: 'zero-2',
            action: 'Target sponsor-ready employers',
            tiedRequirement: 'Sponsorship'
          }
        ],
        oneToThreeMonths: [
          {
            id: 'one-1',
            action: 'Register apprenticeship once employer sponsorship is secured',
            tiedRequirement: 'Registration'
          }
        ],
        threeToTwelveMonths: [
          {
            id: 'three-1',
            action: 'Accumulate on-the-job hours',
            tiedRequirement: 'Hours'
          },
          {
            id: 'three-2',
            action: 'Complete in-school levels',
            tiedRequirement: 'Training'
          }
        ],
        fastestPathToApply: ['Target sponsor-ready employers', 'Register apprenticeship once employer sponsorship is secured'],
        strongCandidatePath: ['WHMIS', 'Working at Heights', 'Standard First Aid']
      }
    },
    transitionReport: {
      marketSnapshot: {
        role: 'Electrician (309A)',
        location: 'Ontario, Canada',
        summaryLine: 'Based on 130 recent postings in Ontario, Canada.',
        topRequirements: [
          {
            id: 'req-1',
            normalized_key: 'licensing-certification',
            label: 'Confirm regional licensing and certification requirements before applying',
            frequency_count: 5,
            frequency_percent: 50,
            evidenceQuote: []
          }
        ],
        topTools: [],
        gateBlockers: []
      },
      mustHaves: [],
      niceToHaves: [],
      coreTasks: [],
      toolsPlatformsEquipment: [],
      transferableStrengths: [],
      plan30_60_90: {
        days30: [],
        days60: [],
        days90: [],
        fastestPathToApply: [],
        strongCandidatePath: []
      },
      evidenceTransparency: {
        employerPostings: {
          source: 'adzuna_cached',
          count: 130,
          lastUpdated: '2026-03-12',
          usedCache: true
        },
        userProvidedPosting: { included: false },
        baselineOnet: { included: true },
        baselineOnlyWarning: null
      }
    },
    executionStrategy: {
      whereYouStandNow: {
        strengths: [],
        missingMandatoryRequirements: [],
        competitiveDisadvantages: []
      },
      realBlockers: {
        requiredToApply: [],
        requiredToCompete: []
      },
      plan90Day: {
        month1: {
          label: 'Month 1',
          weeklyTimeInvestment: '4-6 hrs',
          actions: []
        }
      },
      probabilityRealityCheck: {
        difficulty: 'moderate',
        whatIncreasesOdds: ['Consistent outreach'],
        commonFailureModes: ['No sponsor conversation']
      },
      behavioralExecution: {
        minimumWeeklyEffort: '4-6 hours',
        consistencyLooksLike: ['Weekly outreach'],
        whatNotToDo: ['Do not wait for perfect credentials']
      }
    },
    transitionMode: {
      difficulty: {
        score: 64,
        label: 'Moderate',
        why: ['Demand is strong']
      },
      timeline: {
        minMonths: 1,
        maxMonths: 4,
        assumptions: ['Sponsor route']
      },
      routes: {
        primary: {
          title: 'Sponsor-ready entry',
          reason: 'This is how most apprenticeship starts happen.',
          firstStep: 'Target sponsor-ready employers'
        },
        secondary: {
          title: 'Pre-apprentice entry',
          reason: 'Use this if you need a bridge route.',
          firstStep: 'Confirm pre-apprentice programs'
        },
        contingency: {
          title: 'Maintenance helper',
          reason: 'Keeps you close to the trade while you qualify.',
          firstStep: 'Apply to maintenance helper roles'
        }
      },
      gaps: {
        strengths: ['Safety discipline', 'Reliable shift execution'],
        missing: ['Sponsor route still needs to be secured'],
        first3Steps: [
          'Confirm minimum trade-entry requirements in Ontario',
          'Target sponsor-ready employers',
          'Register apprenticeship once sponsorship is secured'
        ]
      },
      earnings: [],
      reality: {
        barriers: ['Sponsor dependence'],
        mitigations: ['Target employers that register apprentices']
      },
      resources: {
        local: [{ label: 'Provincial pathways', url: 'https://www.ontario.ca/' }],
        online: [],
        internal: []
      }
    },
    transitionStructuredPlan: {
      summary: 'Ontario apprenticeship route with sponsor-first entry.',
      compatibility_level: 'Medium',
      timeline_estimate: '1-4 months',
      required_certifications: ['WHMIS', 'Working at Heights', 'Standard First Aid'],
      required_experience: [],
      action_steps: ['Target sponsor-ready employers'],
      salary_projection: '$22-$55/hr',
      narrative_sections: {
        intro: 'Trade transition',
        skills_you_build: [],
        credentials_you_need: [],
        soft_skills_that_matter: [],
        why_this_path_can_pay_off: [],
        start_from_zero: []
      }
    },
    transitionPlanScripts: {
      call: 'Call script',
      email: 'Email draft',
      source: 'deterministic'
    },
    transitionPlanCacheMeta: {
      version: 'qa',
      generatedAt: '2026-03-12T00:00:00.000Z',
      region: 'ON',
      experienceLevelBucket: 'entry',
      cacheHit: false
    },
    marketEvidence: {
      enabled: true,
      used: true,
      baselineOnly: false,
      usedCache: true,
      postingsCount: 130,
      llmNormalizedCount: 5,
      fetchedAt: '2026-03-12T00:00:00.000Z',
      query: {
        role: 'Electrician (309A)',
        location: 'Ontario, Canada',
        country: 'CA'
      },
      sourcePriority: ['user_posting', 'adzuna', 'onet']
    },
    bottleneck: {
      title: 'Sponsor employer',
      why: 'This path depends on employer registration.',
      nextAction: 'Target sponsor-ready employers this week.',
      estimatedEffort: '1-3 weeks'
    },
    dataTransparency: {
      inputsUsed: ['currentRole', 'targetRole'],
      datasetsUsed: ['qa_browser_fixture'],
      fxRateUsed: null
    },
    v3Diagnostics: {
      missingFields: [],
      generatedAt: '2026-03-12T00:00:00.000Z'
    },
    careerPathwayProfile: {
      meta: {
        title: 'Electrician (309A) - Ontario',
        slug: 'electrician-309a-on',
        jurisdiction: { country: 'CA', region: 'ON' },
        codes: { noc_2021: '72200', trade_code: '309A' },
        teer: 2,
        pathway_type: 'trade_apprenticeship'
      },
      requirements: {
        must_have: [],
        nice_to_have: [],
        starter_cert_bundle: [
          {
            type: 'health_safety',
            name: 'WHMIS',
            source_title: 'CCOHS WHMIS guidance',
            source_url: 'https://www.ccohs.ca/'
          },
          {
            type: 'health_safety',
            name: 'Working at Heights',
            source_title: 'Ontario Working at Heights',
            source_url: 'https://www.ontario.ca/'
          },
          {
            type: 'health_safety',
            name: 'Standard First Aid',
            source_title: 'WSIB First Aid',
            source_url: 'https://www.wsib.ca/'
          }
        ]
      },
      timeline: {
        time_to_full_qualification: { min_months: 48, max_months: 60 },
        phases: []
      },
      resources: {
        official: [{ label: 'Provincial pathways', url: 'https://www.ontario.ca/' }],
        training: [{ title: 'Ontario training directory', url: 'https://www.ontario.ca/' }],
        job_search: []
      },
      sources: []
    }
  }
}

let persistedProgress: ProgressPayload = {
  checkedTaskIds: {},
  expandedPhaseIds: ['phase-1'],
  completedTrainingIds: {},
  outreachTracker: {
    sent: '2',
    replies: '1',
    positiveReplies: '0',
    nextFollowUpDate: '2026-03-20'
  },
  updatedAt: new Date().toISOString()
}

async function waitForServer(url: string, timeoutMs = 120000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // retry
    }
    await delay(1000)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function isServerAvailable(url: string) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

function startDevServer() {
  const child = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npx',
    process.platform === 'win32'
      ? ['/c', 'npx', 'next', 'start', '--port', String(PORT), '--hostname', '127.0.0.1']
      : ['next', 'start', '--port', String(PORT), '--hostname', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENABLE_LOCAL_QA_AUTH: '1'
      },
      stdio: 'pipe'
    }
  )

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk))

  return child
}

async function generatePlan(page: Page) {
  await page.getByPlaceholder('Type your current role').fill('Sous Chef')
  await page.getByPlaceholder('Type your current role').press('Tab')
  await page.getByPlaceholder('Type your target role').fill('Apprentice Electrician')
  await page.getByPlaceholder('Type your target role').press('Tab')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('heading', { name: 'Background', exact: true }).waitFor({ timeout: 10000 })
  await page
    .getByPlaceholder('Example: Led onboarding for 12 teammates, reduced ramp time by 18%, and improved retention by 14%.')
    .fill('Managed safety checklists, trained new team members, and kept shift operations running under pressure.')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('heading', { name: 'Constraints', exact: true }).waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: /Generate My Data-Backed Plan/i }).click()
  await page.getByRole('button', { name: 'Regenerate with Changes' }).waitFor({ timeout: 30000 })
}

async function runQa() {
  let server: ChildProcess | null = null
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
  let page: Page | null = null

  try {
    if (!(await isServerAvailable(TOOL_URL))) {
      server = startDevServer()
    }
    await waitForServer(TOOL_URL)
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    await context.route('**/api/tools/career-switch-planner*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(plannerFixture)
      })
    })
    await context.route('**/api/tools/career-switch-planner/progress**', async (route, request) => {
      if (request.method() === 'GET') {
        console.log(`[qa progress] GET ${request.url()} -> ${JSON.stringify(persistedProgress)}`)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ progress: persistedProgress, updatedAt: persistedProgress.updatedAt })
        })
        return
      }

      console.log(`[qa progress] ${request.method()} ${request.url()}`)
      const body = request.postDataJSON() as { progress?: ProgressPayload }
      if (body.progress) {
        console.log(`[qa progress] payload ${JSON.stringify(body.progress)}`)
        persistedProgress = {
          ...persistedProgress,
          ...body.progress,
          updatedAt: new Date().toISOString()
        }
        console.log(`[qa progress] persisted ${JSON.stringify(persistedProgress)}`)
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
    })
    await context.route('**/api/usage/summary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(plannerFixture.usage)
      })
    })

    page = await context.newPage()
    page.on('console', (message) => {
      console.log(`[browser:${message.type()}] ${message.text()}`)
    })
    page.on('pageerror', (error) => {
      console.error('[browser:pageerror]', error)
    })
    await page.goto(TOOL_URL, { waitUntil: 'networkidle' })

    await generatePlan(page)

    const trainingCards = page.locator('button[aria-pressed]')
    await trainingCards.first().waitFor()
    const incompleteTrainingCard = page.locator('button[aria-pressed="false"]').first()
    const sentIncrement = page.locator('button[aria-label="Increase sent"]').first()
    console.log(`[qa training] cards ${JSON.stringify(await trainingCards.allTextContents())}`)
    console.log(`[qa training] clicking ${(await incompleteTrainingCard.textContent())?.trim()}`)

    await incompleteTrainingCard.click({ force: true })
    await page.waitForFunction(() => {
      return document.querySelectorAll('button[aria-pressed="true"]').length >= 1
    })
    await sentIncrement.click()
    await delay(800)
    await page.getByRole('button', { name: 'Save Plan' }).click()
    await page.getByRole('button', { name: 'Saved' }).waitFor({ timeout: 10000 })

    await page.getByRole('button', { name: 'Start New Plan' }).first().click()
    await page.getByPlaceholder('Type your current role').waitFor()

    await generatePlan(page)

    await page.waitForFunction(() => {
      return document.querySelectorAll('button[aria-pressed="true"]').length >= 1
    })

    const rehydratedCompletedTrainingCount = await page.locator('button[aria-pressed="true"]').count()
    if (rehydratedCompletedTrainingCount < 1) {
      throw new Error('Expected saved training completion to rehydrate on regeneration')
    }

    await page.getByText(/3\/\d+\s+sent/i).first().waitFor({ timeout: 10000 })

    console.log('[qa:planner-browser-e2e] passed')
  } finally {
    if (page) {
      await page.screenshot({ path: 'tmp-planner-browser-e2e-failure.png', fullPage: true }).catch(() => {})
    }
    await browser?.close()
    if (server) {
      await stopProcess(server)
    }
  }
}

async function stopProcess(child: ChildProcess) {
  if (child.killed) return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'])
    await delay(1500)
    return
  }

  child.kill('SIGTERM')
  await delay(1500)
}

runQa().catch((error) => {
  console.error('[qa:planner-browser-e2e] failed')
  console.error(error)
  process.exitCode = 1
})
