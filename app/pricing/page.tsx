import PricingCard from '@/components/PricingCard'
import FAQAccordion from '@/components/FAQAccordion'
import { pricingFaqs, pricingPlans } from '@/src/design/mockupData'

export default function PricingPage() {
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
        <div className="mx-auto grid max-w-tool gap-6 md:grid-cols-2">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              price={plan.price}
              subtitle={plan.subtitle}
              features={plan.features}
              highlighted={plan.highlighted}
              href="/checkout"
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-text-tertiary">
          30-day money-back guarantee. No questions asked.
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
