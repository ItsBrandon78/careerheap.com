import type { Metadata } from 'next'
import Link from 'next/link'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Badge from '@/components/Badge'

export const metadata: Metadata = {
  title: 'About — CareerHeap',
  description: 'CareerHeap helps Canadians make better career moves with structured planning tools, real timelines, and clear next steps.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About CareerHeap',
    description: 'CareerHeap helps Canadians make better career moves with structured planning tools, real timelines, and clear next steps.',
    type: 'website',
  },
}

const values = [
  {
    title: 'Canada-first',
    description:
      'Every roadmap reflects Canadian licensing requirements, NOC codes, provincial contexts, and salary ranges in CAD.',
  },
  {
    title: 'Structured, not generic',
    description:
      'We give you a specific path with milestones, not vague advice. Timelines are real, requirements are sourced.',
  },
  {
    title: 'Built for follow-through',
    description:
      'Checklists, 14-day action windows, and execution trackers keep your transition moving week by week.',
  },
]

export default function AboutPage() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-section text-center lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <Badge>Canada-first career planning</Badge>
          <h1 className="mt-4 text-[42px] font-bold leading-tight text-text-primary md:text-[48px]">
            About CareerHeap
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-lg leading-[1.7] text-text-secondary">
            CareerHeap helps professionals make better career moves with practical guidance,
            structured planning tools, and clear next steps — built specifically for the Canadian
            job market.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <h2 className="text-center text-[32px] font-bold text-text-primary">What we believe</h2>
          <p className="mx-auto mt-4 max-w-[600px] text-center text-base leading-[1.7] text-text-secondary">
            Most career tools give generic advice. We think you deserve a real plan — one that
            accounts for where you live, what you have, and what it actually takes to get there.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <Card key={value.title} className="p-6 shadow-card">
                <h3 className="text-[17px] font-bold text-text-primary">{value.title}</h3>
                <p className="mt-3 text-sm leading-[1.65] text-text-secondary">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-panel md:p-12">
            <h2 className="text-[28px] font-bold text-text-primary">The problem we&apos;re solving</h2>
            <p className="mt-4 max-w-[700px] text-base leading-[1.75] text-text-secondary">
              Switching careers in Canada is uniquely complicated. Regulated professions require
              province-specific licensing. Trades have apprenticeship hour requirements. Tech roles
              need portfolio proof. Most career resources either ignore Canada entirely or give you
              a US-centric roadmap that doesn&apos;t account for NOC codes, provincial regulators, or
              Canadian salary benchmarks.
            </p>
            <p className="mt-4 max-w-[700px] text-base leading-[1.75] text-text-secondary">
              CareerHeap maps your transition against real Canadian requirements, shows you the
              fastest practical route, and surfaces the blockers you&apos;ll actually face — before you
              waste time on the wrong path.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center lg:px-[170px]">
        <div className="mx-auto max-w-[600px]">
          <h2 className="text-[28px] font-bold text-text-primary">Start your transition plan</h2>
          <p className="mt-4 text-base leading-[1.7] text-text-secondary">
            Free to start. 3 lifetime career analyses included. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/tools/career-switch-planner">
              <Button variant="primary">Try the Career Switch Planner</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline">See Pricing</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
