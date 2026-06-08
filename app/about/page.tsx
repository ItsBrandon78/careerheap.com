import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'About — CareerHeap',
  description:
    'CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About CareerHeap',
    description:
      'CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience.',
    type: 'website'
  }
}

const VALUES: [string, string, string][] = [
  ['shield', 'Honest by default', 'Source-backed numbers, labeled estimates, and no invented facts — ever.'],
  ['rocket', 'Action over diagnosis', "We don't just name the gap. We hand you the week-by-week bridge across it."],
  ['users', 'Built for beginners', 'Zero experience is a starting line. The whole product is designed around that.']
]

const btnPrimaryLg =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-button transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px'

export default function AboutPage() {
  return (
    <>
      <PageHero
        badge="Our mission"
        title="Everyone deserves a path in"
        sub="CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience."
      />

      <section className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 24 }}>
        <div className="flex flex-col gap-[22px] text-[17px] leading-[1.75] text-text-secondary">
          <p>
            The career advice most people get is either vague (&ldquo;network more!&rdquo;) or pessimistic
            (&ldquo;you&apos;ll need years of experience first&rdquo;). Neither helps you take the next step.
          </p>
          <p className="text-[20px] font-semibold text-text-primary">
            We built CareerHeap on a simple belief: a clear, honest, source-backed plan beats a vague
            compatibility score every time.
          </p>
          <p>
            Every roadmap is grounded in real occupation data, real wages, and real requirements — and every
            number shows where it came from. We never invent salaries or certifications, and we label what we
            don&apos;t know instead of guessing. When the news is hard, we tell you the bridge, not just the wall.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {VALUES.map(([icon, t, d]) => (
            <div key={t} className="rounded-lg border border-border-light bg-surface p-[26px] shadow-card">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-md bg-[#e3f7f6] text-[#0a7f7e]">
                <Icon name={icon} size={22} />
              </span>
              <h3 className="mt-[18px] text-[18px] font-bold">{t}</h3>
              <p className="mt-2 text-[14px] leading-[1.65] text-text-secondary">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 72 }}>
        <div className="relative overflow-hidden rounded-xl bg-bg-dark text-center" style={{ padding: '48px 40px' }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 80% -20%, rgba(36,93,255,0.4), transparent 50%), radial-gradient(circle at 0% 120%, rgba(14,165,164,0.25), transparent 45%)'
            }}
          />
          <div className="relative">
            <h2 className="text-[30px] font-extrabold text-white">Start where you are.</h2>
            <p className="mt-3 text-[16.5px] text-text-on-dark-muted">
              Your first plan is free and takes four minutes.
            </p>
            <Link href="/tools/career-switch-planner" className={`${btnPrimaryLg} mt-6`}>
              <Icon name="rocket" size={18} /> Build my plan
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
