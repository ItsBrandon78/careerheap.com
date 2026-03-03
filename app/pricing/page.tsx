'use client'

import PricingCard from '@/components/PricingCard'
import FAQAccordion from '@/components/FAQAccordion'
import { pricingFaqs, pricingPlans } from '@/src/design/mockupData'

export default function PricingPage() {
  const foundersEnabled = process.env.NEXT_PUBLIC_FOUNDERS_LIFETIME_ENABLED !== '0'
  const visiblePlans = pricingPlans.filter((plan) => foundersEnabled || plan.name !== 'Founders')

  return (
    <>
      <section className="px-4 pb-4 pt-20 text-center lg:px-[170px]">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">PRICING</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Simple, Transparent Pricing</h1>
        <p className="mx-auto mt-4 max-w-[500px] text-lg leading-[1.6] text-text-secondary">
          Province-aware Canadian career pathways, with a clearer upgrade path and no pricing fluff.
        </p>
      </section>

      <section className="px-4 py-12 lg:px-[340px]">
        <div className="mx-auto grid max-w-content gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visiblePlans.map((plan) => {
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
                href={
                  plan.name === 'Free'
                    ? '/tools/career-switch-planner'
                    : plan.name === 'Founders'
                      ? '/checkout?plan=lifetime'
                      : plan.name === 'Annual'
                        ? '/checkout?plan=pro&cadence=yearly'
                        : '/checkout?plan=pro&cadence=monthly'
                }
              />
            )
          })}
        </div>
        <p className="mt-8 text-center text-sm text-text-tertiary">
          Secure checkout. Subscription plans can still be managed from your account.
        </p>
      </section>

      <section className="px-4 py-16 lg:px-[340px]">
        <div className="mx-auto max-w-tool">
          <h2 className="mb-8 text-center text-2xl font-bold text-text-primary">Frequently Asked Questions</h2>
          <FAQAccordion items={pricingFaqs} compact />
        </div>
      </section>
    </>
  )
}
