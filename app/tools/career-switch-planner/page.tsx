import { Suspense } from 'react'
import Badge from '@/components/Badge'
import CareerSwitchPlannerClientPage from './CareerSwitchPlannerClient'
import { isMarketEvidenceConfigured } from '@/lib/server/jobRequirements'

function PlannerFallback() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className="gap-1 !px-2 !py-0.5 !text-[11px]">3 lifetime free analyses</Badge>
            <Badge className="gap-1 !border-border-light !bg-surface !px-2 !py-0.5 !text-[11px] !font-medium !text-text-tertiary">
              Province-aware
            </Badge>
            <Badge className="gap-1 !border-border-light !bg-surface !px-2 !py-0.5 !text-[11px] !font-medium !text-text-tertiary">
              Resume Upload (Pro)
            </Badge>
          </div>
          <h1 className="text-[34px] font-bold leading-tight text-text-primary md:text-[40px]">
            Career Switch Planner
          </h1>
          <p className="max-w-[680px] text-base leading-[1.6] text-text-secondary md:text-lg">
            Build a structured Canadian transition roadmap with clearer timelines, province-aware
            context, and practical weekly next steps.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 pt-12 lg:px-[170px]">
        <div className="mx-auto w-full max-w-[1260px]">
          <div className="mx-auto w-full max-w-tool rounded-lg border border-border bg-surface p-5 shadow-panel md:p-8">
            <h2 className="text-base font-bold text-text-primary">Start your transition plan</h2>
            <p className="mt-2 text-sm text-text-secondary">
              If interactive features take longer than expected, refresh the page and try again.
            </p>
            <form className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Current Role</span>
                <input
                  disabled
                  placeholder="Type your current role"
                  className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-tertiary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Target Role</span>
                <input
                  disabled
                  placeholder="Type your target role"
                  className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-tertiary"
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Skills</span>
                <input
                  disabled
                  placeholder="Add at least 3 skills"
                  className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-tertiary"
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">Experience summary</span>
                <textarea
                  disabled
                  rows={5}
                  placeholder="Add measurable accomplishments and context."
                  className="w-full rounded-md border border-border bg-bg-secondary p-3 text-sm text-text-tertiary"
                />
              </label>
            </form>
            <div className="mt-5 rounded-md border border-warning/25 bg-warning-light px-3 py-2 text-sm text-text-secondary">
              Loading planner UI...
            </div>
            <noscript>
              <p className="mt-3 rounded-md border border-error/20 bg-error-light px-3 py-2 text-sm text-error">
                JavaScript is required for plan generation. Enable JavaScript and reload this page.
              </p>
            </noscript>
          </div>
        </div>
      </section>
    </>
  )
}

export default function CareerSwitchPlannerPage() {
  const marketEvidenceAvailable = isMarketEvidenceConfigured()

  return (
    <Suspense fallback={<PlannerFallback />}>
      <CareerSwitchPlannerClientPage marketEvidenceAvailable={marketEvidenceAvailable} />
    </Suspense>
  )
}
