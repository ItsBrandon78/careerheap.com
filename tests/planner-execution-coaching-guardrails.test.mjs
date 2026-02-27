import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadTranspiledTsModule(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  }).outputText

  const cjsModule = { exports: {} }
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    process: { env: {} }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const plannerPath = path.resolve(__dirname, '../lib/server/careerMapPlanner.ts')
const coachPath = path.resolve(__dirname, '../lib/server/plannerExecutionCoach.ts')
const plannerClientPath = path.resolve(
  __dirname,
  '../app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx'
)

const plannerSource = readFileSync(plannerPath, 'utf8')
const plannerClientSource = readFileSync(plannerClientPath, 'utf8')

test('planner report includes executionStrategy contract and context wiring', () => {
  assert.match(plannerSource, /executionStrategy:/)
  assert.match(plannerSource, /generateExecutionStrategyFromContext/)
  assert.match(plannerSource, /missingMandatory/)
  assert.match(plannerSource, /competitiveDisadvantages/)
  assert.match(plannerSource, /monthRequirementKeys/)
  assert.match(plannerSource, /isLongHorizonCredentialRequirement/)
  assert.match(plannerSource, /isImmediateEntryGate/)
})

test('deterministic execution strategy enforces minimum actions and linked requirements', () => {
  const coachModule = loadTranspiledTsModule(coachPath)
  const { buildDeterministicExecutionStrategy } = coachModule

  const context = {
    roleTitle: 'Construction Electrician Apprentice',
    location: 'Ontario',
    roleFamily: 'trades',
    baselineOnly: false,
    resumeSignals: [
      'Led safety checks and shift handovers in a high-pressure kitchen environment.',
      'Maintained and troubleshot commercial-grade gas and electrical equipment.',
      'Trained new hires and enforced compliance procedures during peak service.'
    ],
    strengths: [
      {
        summary: 'Your safety routines already align with regulated worksites.',
        resumeSignal: 'Led safety checks and shift handovers in a high-pressure kitchen environment.',
        countsToward: ['Follow site safety procedures and hazard controls']
      }
    ],
    missingMandatory: [
      {
        normalized_key: 'obtain-working-at-heights-certification-before-applying',
        label: 'Obtain Working at Heights certification before applying',
        blockerClass: 'legal_certification',
        reason: 'No verified credential signal yet for this apply gate.'
      }
    ],
    competitiveDisadvantages: [
      {
        normalized_key: 'install-conduit-and-route-circuits-on-active-job-sites',
        label: 'Install conduit and route circuits on active job sites',
        blockerClass: 'skill',
        reason: 'Current profile does not yet show consistent proof for this hiring signal.'
      }
    ],
    requirements: [
      {
        normalized_key: 'obtain-working-at-heights-certification-before-applying',
        label: 'Obtain Working at Heights certification before applying',
        type: 'gate',
        blockerClass: 'legal_certification',
        requiredFor: 'apply',
        urgency: 'immediate',
        howToGet: 'Book a certified Working at Heights course and pass the assessment.',
        timeEstimate: '1-2 weeks',
        evidenceQuote: ['Working at Heights certification required for site entry']
      },
      {
        normalized_key: 'install-conduit-and-route-circuits-on-active-job-sites',
        label: 'Install conduit and route circuits on active job sites',
        type: 'hard_skill',
        blockerClass: 'skill',
        requiredFor: 'compete',
        urgency: 'near_term',
        howToGet: 'Run hands-on conduit drills and document measurements.',
        timeEstimate: '2-4 weeks',
        evidenceQuote: ['Install conduit and pull wire on commercial projects']
      },
      {
        normalized_key: 'troubleshoot-basic-electrical-faults-using-multimeter-workflows',
        label: 'Troubleshoot basic electrical faults using multimeter workflows',
        type: 'tool',
        blockerClass: 'skill',
        requiredFor: 'compete',
        urgency: 'near_term',
        howToGet: 'Practice diagnostic workflows and log each scenario.',
        timeEstimate: '2-4 weeks',
        evidenceQuote: ['Use multimeter diagnostics to isolate electrical faults']
      }
    ],
    requiredToApplyKeys: ['obtain-working-at-heights-certification-before-applying'],
    requiredToCompeteKeys: [
      'install-conduit-and-route-circuits-on-active-job-sites',
      'troubleshoot-basic-electrical-faults-using-multimeter-workflows'
    ],
    monthRequirementKeys: {
      month1: [
        'obtain-working-at-heights-certification-before-applying',
        'install-conduit-and-route-circuits-on-active-job-sites'
      ],
      month2: ['troubleshoot-basic-electrical-faults-using-multimeter-workflows'],
      month3: ['install-conduit-and-route-circuits-on-active-job-sites']
    },
    transferCandidates: [
      {
        resumeSignal: 'Maintained and troubleshot commercial-grade gas and electrical equipment.',
        countsToward: [
          'Troubleshoot basic electrical faults using multimeter workflows',
          'Install conduit and route circuits on active job sites'
        ]
      },
      {
        resumeSignal: 'Led safety checks and shift handovers in a high-pressure kitchen environment.',
        countsToward: ['Obtain Working at Heights certification before applying']
      },
      {
        resumeSignal: 'Trained new hires and enforced compliance procedures during peak service.',
        countsToward: ['Follow site safety procedures and hazard controls']
      }
    ]
  }

  const strategy = buildDeterministicExecutionStrategy(context)

  assert.ok(strategy.transferableEdge.translations.length >= 3)
  assert.ok(strategy.plan90Day.month1.actions.length >= 5)
  assert.ok(strategy.plan90Day.month2.actions.length >= 5)
  assert.ok(strategy.plan90Day.month3.actions.length >= 5)

  const allowedKeys = new Set(context.requirements.map((item) => item.normalized_key))
  for (const month of [strategy.plan90Day.month1, strategy.plan90Day.month2, strategy.plan90Day.month3]) {
    for (const action of month.actions) {
      assert.ok(action.linkedRequirements.length > 0)
      assert.ok(action.linkedRequirements.every((key) => allowedKeys.has(key)))
    }
  }

  const json = JSON.stringify(strategy)
  assert.doesNotMatch(json, /%/)
  assert.doesNotMatch(json, /\b\d+\s*\/\s*100\b/)
  assert.doesNotMatch(json, /improve communication|develop skills|gain experience/i)
})

test('execution strategy UI is primary in transition mode and avoids percentage render in coaching block', () => {
  assert.match(plannerClientSource, /Personalized execution strategy/)
  assert.match(plannerClientSource, /1\) Where You Stand Right Now/)
  assert.match(plannerClientSource, /2\) Real Blockers \(Entry Requirements\)/)
  assert.match(plannerClientSource, /3\) Your Transferable Edge/)
  assert.match(plannerClientSource, /4\) 90-Day Execution Plan/)
  assert.match(plannerClientSource, /5\) Probability & Reality Check/)
  assert.match(plannerClientSource, /6\) Behavioral Execution/)

  const coachingBlock = plannerClientSource.match(
    /Personalized execution strategy([\s\S]*?)\) : transitionReport \?/s
  )
  assert.ok(coachingBlock, 'Execution strategy block not found')
  assert.doesNotMatch(coachingBlock[1], /frequencyPercentLabel|%/)
})

test('execution strategy month ordering keeps immediate blockers ahead of long-horizon gates', () => {
  assert.match(plannerSource, /month1RequirementKeys = uniqueStrings\(/)
  assert.match(plannerSource, /filter\(\(item\) => !isLongHorizonCredentialRequirement\(item\)\)/)
})

