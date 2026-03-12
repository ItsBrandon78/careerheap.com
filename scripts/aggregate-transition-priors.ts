import './loadEnvLocal'
import process from 'node:process'
import { aggregateTransitionPriors } from '@/lib/server/plannerLearning'

async function main() {
  const result = await aggregateTransitionPriors()
  console.log(
    JSON.stringify(
      {
        ok: true,
        ranAt: new Date().toISOString(),
        groupsProcessed: result.groupsProcessed
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[aggregate-transition-priors] failed')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
