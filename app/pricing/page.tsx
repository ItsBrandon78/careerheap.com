'use client'

import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import PricingCard from '@/components/PricingCard'
import FAQAccordion from '@/components/FAQAccordion'
import { pricingFaqs, pricingPlans } from '@/src/design/mockupData'

export default function PricingPage() {
  const foundersEnabled = process.env.NEXT_PUBLIC_FOUNDERS_LIFETIME_ENABLED !== '0'
  const visiblePlans = pricingPlans.filter((plan) => foundersEnabled || plan.name !== 'Founders')
  const primaryPlans = visiblePlans.filter((plan) => plan.name !== 'Annual')
  const annualPlan = visiblePlans.find((plan) => plan.name === 'Annual') ?? null

  return (
    <>
      <section className="bg-bg-secondary px-4 pb-10 pt-20 text-center lg:px-[170px]">
        <Badge variant="default">PRICING IN CAD</Badge>
        <h1 className="mt-4 text-[40px] font-bold text-text-primary">Simple, Transparent Pricing in CAD</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-lg leading-[1.7] text-text-secondary">
          Start free, upgrade when you need full province-aware guidance, refined pathway detail, and exportable roadmaps.
        </p>
      </section>

      <section className="px-4 py-12 lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="grid gap-6 lg:grid-cols-3">
            {primaryPlans.map((plan) => {
              const isPro = plan.name === 'Pro'

              return (
                <PricingCard
                  key={plan.name}
                  name={plan.name}
                  price={plan.price}
                  subtitle={plan.subtitle}
                  features={plan.features}
                  highlighted={plan.highlighted}
                  badge={plan.badge}
                  buttonText={plan.buttonText}
                  detailsSlot={
                    isPro && annualPlan ? (
                      <div className="rounded-lg border border-border-light bg-bg-secondary px-3 py-2 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-accent">
                          Annual option
                        </p>
                        <p className="mt-1 text-xs leading-[1.6] text-text-secondary">
                          Save with {annualPlan.price} billed yearly when you want the same full access at a lower annual price.
                        </p>
                      </div>
                    ) : null
                  }
                  href={
                    plan.name === 'Free'
                      ? '/tools/career-switch-planner'
                      : plan.name === 'Founders'
                        ? '/checkout?plan=lifetime'
                        : '/checkout?plan=pro&cadence=monthly'
                  }
                />
              )
            })}
          </div>

          {annualPlan ? (
            <Card className="mt-6 flex flex-col gap-4 border border-border-light bg-bg-secondary p-5 shadow-none md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[1.1px] text-accent">Annual savings</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{annualPlan.price} for a full year</p>
                <p className="mt-2 max-w-[60ch] text-sm leading-[1.7] text-text-secondary">
                  Choose annual billing for everything in Pro with a lower yearly price and the same province-aware roadmap access.
                </p>
              </div>
              <Link href="/checkout?plan=pro&cadence=yearly">
                <Button variant="outline" className="w-full md:w-auto">
                  Choose Annual
                </Button>
              </Link>
            </Card>
          ) : null}

          <div className="mt-6">
            <p className="text-sm font-semibold text-text-secondary">Why Canadians upgrade</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                'Province-specific requirements and regulator context',
                'Full roadmap depth with clearer next actions',
                'Exportable reports for planning and follow-through'
              ].map((item) => (
                <Card key={item} className="p-4 shadow-none">
                  <p className="text-sm font-medium text-text-primary">{item}</p>
                </Card>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-text-tertiary">
            CAD pricing. Secure checkout. Manage billing anytime.
          </p>
        </div>
      </section>

      <section className="px-4 pb-16 lg:px-[340px]">
        <div className="mx-auto max-w-tool">
          <h2 className="mb-3 text-center text-2xl font-bold text-text-primary">Buying Confidence</h2>
          <p className="mb-8 text-center text-sm leading-[1.7] text-text-secondary">
            Clear plans, predictable billing, and the same workflow whether you stay free or upgrade.
          </p>
          <FAQAccordion items={pricingFaqs} compact />
        </div>
      </section>
    </>
  )
}
