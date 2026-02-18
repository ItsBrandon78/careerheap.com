import { Suspense } from 'react'
import CareerSwitchPlannerClientPage from './CareerSwitchPlannerClient'

function PlannerFallback() {
  return (
    <section className="px-4 py-16 lg:px-[340px]">
      <div className="mx-auto h-44 w-full max-w-tool animate-pulse rounded-lg border border-border bg-bg-secondary" />
    </section>
  )
}

export default function CareerSwitchPlannerPage() {
  return (
    <Suspense fallback={<PlannerFallback />}>
      <CareerSwitchPlannerClientPage />
    </Suspense>
  )
}
