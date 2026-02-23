'use client'

import { useState } from 'react'
import PricingCard from '@/components/PricingCard'
import FAQAccordion from '@/components/FAQAccordion'
import { pricingFaqs, pricingPlans } from '@/src/design/mockupData'

type ProCadence = 'monthly' | 'yearly'

export default function PricingPage() {
  const [proCadence, setProCadence] = useState<ProCadence>('monthly')

  return (
    <>
      <section className="px-4 pb-4 pt-20 text-center lg:px-[170px]">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">PRICING</p>
        <h1 className="mt-3 text-[40px] font-bold text-text-primary">Simple, Transparent Pricing</h1>
        <p className="mx-auto mt-4 max-w-[500px] text-lg leading-[1.6] text-text-secondary">
          Upgrade to unlock unlimited access to every CareerHeap tool. Cancel anytime.
        </p>
      </section>

      <section className="px-4 py-12 lg:px-[340px]">
        <div className="mx-auto grid max-w-content gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => {
            const isPro = plan.name === 'Pro'
            const proPrice = proCadence === 'yearly' ? '$70' : '$7'
            const proSubtitle = proCadence === 'yearly' ? '/year' : '/month'

            return (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={isPro ? proPrice : plan.price}
                subtitle={isPro ? proSubtitle : plan.subtitle}
                features={plan.features}
                highlighted={plan.highlighted}
                badge={plan.badge}
                buttonText={plan.buttonText}
                href={
                  plan.name === 'Free'
                    ? '/tools/career-switch-planner'
                    : plan.name === 'Lifetime'
                      ? '/checkout?plan=lifetime'
                      : `/checkout?plan=pro&cadence=${proCadence}`
                }
                detailsSlot={
                  isPro ? (
                    <div className="inline-flex rounded-pill border border-border bg-bg-secondary p-1">
                      <button
                        type="button"
                        onClick={() => setProCadence('monthly')}
                        className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                          proCadence === 'monthly'
                            ? 'bg-surface text-text-primary'
                            : 'text-text-secondary'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setProCadence('yearly')}
                        className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                          proCadence === 'yearly'
                            ? 'bg-surface text-text-primary'
                            : 'text-text-secondary'
                        }`}
                      >
                        Yearly
                      </button>
                    </div>
                  ) : undefined
                }
              />
            )
          })}
        </div>
        <p className="mt-8 text-center text-sm text-text-tertiary">
          Secure checkout. Cancel subscription plans anytime.
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
