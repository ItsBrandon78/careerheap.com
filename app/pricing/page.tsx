import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import FAQAccordion from '@/components/FAQAccordion'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Pricing — CareerHeap',
  description:
    'Start free. Upgrade to Pro for unlimited province-aware roadmaps, résumé upload, and exportable plans. CAD pricing.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Simple, transparent pricing — CareerHeap',
    description:
      'Start free. Upgrade when you want full province-aware guidance, résumé upload, and exportable roadmaps.',
    type: 'website'
  }
}

// NOTE: prototype pricing chosen as canonical (Pro $15/mo, Annual $129/yr, Founders $99 one-time).
// Stripe products/price IDs must be created to match these amounts before checkout charges correctly.
type Plan = {
  name: string
  price: string
  unit?: string
  sub: string
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    sub: 'Canada-first preview',
    cta: 'Start free',
    href: '/tools/career-switch-planner',
    features: ['Roadmap preview', 'Manual paste input', 'Core pathway summary', '3 lifetime analyses']
  },
  {
    name: 'Pro',
    price: '$15',
    unit: 'CAD / month',
    sub: 'For a serious job search',
    cta: 'Upgrade to Pro',
    href: '/checkout?plan=pro&cadence=monthly',
    highlighted: true,
    badge: 'Most popular',
    features: [
      'Unlimited roadmaps',
      'Province-specific requirements',
      'Full step breakdown',
      'Résumé upload & parsing',
      'PDF & Notion export'
    ]
  },
  {
    name: 'Annual',
    price: '$129',
    unit: 'CAD / year',
    sub: 'Pro, at a lower yearly price',
    cta: 'Choose Annual',
    href: '/checkout?plan=pro&cadence=yearly',
    features: ['Everything in Pro', 'Save ~28% vs monthly', 'Province-aware planning all year']
  }
]

const FAQS = [
  {
    question: 'Can I try before I buy?',
    answer:
      'Yes. Free lets you preview a real pathway and see the core roadmap structure before upgrading — no credit card required.'
  },
  {
    question: 'What unlocks with Pro?',
    answer:
      'Pro unlocks unlimited roadmaps, province-specific requirements, deeper step breakdowns, résumé upload, and PDF export.'
  },
  { question: 'How is Annual different?', answer: 'Annual includes everything in Pro at a lower yearly price than paying month to month.' },
  { question: 'What is Founders access?', answer: 'A limited one-time offer that unlocks the full product with no recurring billing.' },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Major credit cards through secure checkout. You can manage or cancel billing anytime from your account.'
  }
]

const btn = 'inline-flex w-full items-center justify-center gap-2 rounded-lg px-[22px] py-[13px] text-[15px] font-semibold transition-all duration-150'

export default function PricingPage() {
  return (
    <>
      <PageHero
        badge="Pricing in CAD"
        title="Simple, transparent pricing"
        sub="Start free. Upgrade when you want full province-aware guidance, résumé upload, and exportable roadmaps."
      />

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 24 }}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="relative flex flex-col rounded-lg bg-surface p-7"
              style={{
                border: p.highlighted ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-light)',
                boxShadow: p.highlighted ? '0 16px 40px rgba(36,93,255,0.16)' : 'var(--sh-card, 0 6px 20px rgba(12,20,37,0.06))'
              }}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
                  <Icon name="star" size={12} fill /> {p.badge}
                </span>
              )}
              <p className="text-[15px] font-bold">{p.name}</p>
              <p className="mt-1 text-[13.5px] text-text-tertiary">{p.sub}</p>
              <div className="mt-[18px] flex items-baseline gap-2">
                <span className="text-[40px] font-extrabold tracking-[-0.03em]">{p.price}</span>
                {p.unit && <span className="text-[14px] font-medium text-text-tertiary">{p.unit}</span>}
              </div>
              <Link href={p.href} className={`${btn} mt-[22px] ${p.highlighted ? 'bg-accent text-white shadow-button hover:bg-accent-hover' : 'border border-border bg-surface text-text-secondary hover:border-accent hover:bg-accent-light hover:text-accent'}`}>
                {p.cta}
              </Link>
              <div className="my-6 h-px bg-border-light" />
              <ul className="flex flex-col gap-3.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14px] leading-[1.5] text-text-secondary">
                    <span className="shrink-0 text-success">
                      <Icon name="checkCircle" size={17} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Founders banner */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-border-light bg-bg-secondary p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-warning-light px-[11px] py-[5px] text-[12px] font-semibold text-warning">
              <Icon name="zap" size={12} /> Limited
            </span>
            <h3 className="mt-2.5 text-[19px] font-extrabold">Founders — $99 CAD</h3>
            <p className="mt-1.5 max-w-[460px] text-[14px] text-text-secondary">
              Everything in Pro with no recurring billing. Lock in lifetime access.
            </p>
          </div>
          <Link href="/checkout?plan=lifetime" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-[22px] py-[13px] text-[15px] font-semibold text-white transition-all duration-150 hover:bg-bg-dark-surface">
            Get Founders access
          </Link>
        </div>

        <div className="mt-10">
          <p className="text-[14px] font-bold text-text-secondary">Why Canadians upgrade</p>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {[
              ['Province-specific truth', 'Requirements and regulator context for your actual province.'],
              ['Full roadmap depth', 'Every phase, effort estimate, and proof-of-work artifact.'],
              ['Exportable plans', 'Take your roadmap to PDF or Notion and share it.']
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border-light bg-surface p-[18px]">
                <p className="text-[14.5px] font-bold">{t}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-text-secondary">{d}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-7 text-center text-[13px] text-text-tertiary">
          CAD pricing · Secure checkout · Manage billing anytime
        </p>
      </section>

      <section className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 72 }}>
        <h2 className="text-center text-[26px] font-extrabold">Questions, answered</h2>
        <p className="mb-7 mt-2 text-center text-[15px] text-text-secondary">
          Clear plans, predictable billing, same workflow whether you stay free or upgrade.
        </p>
        <FAQAccordion items={FAQS} compact />
      </section>
    </>
  )
}
