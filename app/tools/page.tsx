import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'

export const metadata: Metadata = {
  title: 'Career Tools — CareerHeap',
  description:
    'Start with the planner to find your path, then sharpen your résumé, interviews, and applications.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'The CareerHeap toolkit',
    description:
      'Résumé analyzer, interview prep, cover letter writer, and the career switch planner — built for Canadian job seekers.',
    type: 'website'
  }
}

type Tool = {
  slug: string
  title: string
  desc: string
  icon: string
  active: boolean
  href?: string
}

const TOOLS: Tool[] = [
  {
    slug: 'resume-analyzer',
    title: 'Résumé Analyzer',
    desc: 'Tighten your résumé for real employer filters and Canadian job expectations.',
    icon: 'award',
    active: true,
    href: '/tools/resume-analyzer'
  },
  {
    slug: 'resume-builder',
    title: 'Résumé Builder',
    desc: 'Build and edit a clean, recruiter-ready résumé with a live preview and PDF export.',
    icon: 'book',
    active: true,
    href: '/tools/resume-builder'
  },
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    desc: 'Practice stronger answers based on the role, the posting, and what employers actually ask.',
    icon: 'message',
    active: true,
    href: '/tools/interview-prep'
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    desc: 'Create a focused cover letter using the job posting and your real background.',
    icon: 'book',
    active: true,
    href: '/tools/cover-letter'
  },
  {
    slug: 'job-match-score',
    title: 'Job Match Score',
    desc: 'See how well your profile matches a posting and exactly what to improve.',
    icon: 'target',
    active: false
  }
]

export default function ToolsPage() {
  return (
    <>
      <PageHero
        badge="The CareerHeap toolkit"
        title="Tools for every step of the search"
        sub="Start with the planner to find your path, then sharpen your résumé, interviews, and applications."
      />

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 72 }}>
        {/* featured */}
        <Link
          href="/tools/career-switch-planner"
          className="grid overflow-hidden rounded-lg border-[1.5px] border-accent bg-surface md:grid-cols-[1.1fr_1fr]"
        >
          <div className="p-9">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
              <Icon name="sparkle" size={12} fill /> Start here
            </span>
            <h2 className="mt-4 text-[26px] font-extrabold">Career Switch Planner</h2>
            <p className="mt-2.5 max-w-[420px] text-[15.5px] leading-[1.65] text-text-secondary">
              See the Canadian pathway, timeline, requirements, and exact next steps for any first role.
            </p>
            <span className="mt-[22px] inline-flex items-center gap-2 rounded-lg bg-accent px-[22px] py-[13px] text-[15px] font-semibold text-white shadow-button">
              <Icon name="rocket" size={17} /> Build my plan
            </span>
          </div>
          <div className="relative grid min-h-[220px] place-items-center overflow-hidden bg-bg-dark">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 70% 20%, rgba(36,93,255,0.5), transparent 55%), radial-gradient(circle at 10% 100%, rgba(14,165,164,0.35), transparent 50%)'
              }}
            />
            <div className="relative flex items-end gap-2" style={{ height: 110 }}>
              {[40, 60, 82, 104, 128].map((h, i) => (
                <div
                  key={i}
                  className="w-[22px] rounded-md"
                  style={{ height: h, background: i === 4 ? 'var(--color-accent-secondary)' : 'rgba(255,255,255,0.85)' }}
                />
              ))}
            </div>
          </div>
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOLS.map((t) => (
            <div
              key={t.slug}
              className="flex items-start gap-4 rounded-lg border border-border-light bg-surface p-6 shadow-card"
              style={{ opacity: t.active ? 1 : 0.72 }}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${
                  t.active ? 'bg-accent-light text-accent' : 'bg-bg-secondary text-text-tertiary'
                }`}
              >
                <Icon name={t.icon} size={23} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold">{t.title}</h3>
                  {!t.active && (
                    <span className="rounded-pill bg-bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-text-secondary">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-text-secondary">{t.desc}</p>
                {t.active && t.href && (
                  <Link
                    href={t.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent"
                  >
                    Open tool <Icon name="arrow" size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
