import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

const HOW_IT_WORKS = [
  {
    n: '01',
    icon: 'compass',
    t: 'Tell us where you are',
    d: 'Your situation, interests, and whatever skills you already have — even from a part-time job or a class project. No résumé needed.'
  },
  {
    n: '02',
    icon: 'target',
    t: 'See real roles you can reach',
    d: 'Get ranked, honest matches with starting salaries, demand, and exactly why each one fits you.'
  },
  {
    n: '03',
    icon: 'map',
    t: 'Follow a week-by-week plan',
    d: 'A roadmap of skills, free training, and proof-of-work — checkable, paced to your timeline, and yours to export.'
  }
]

const PATHWAYS = [
  { t: 'Junior Data Analyst', tag: 'Portfolio-first', icon: 'database' },
  { t: 'Marketing Coordinator', tag: 'Transition-friendly', icon: 'trending' },
  { t: 'Customer Success', tag: 'Fastest route', icon: 'users' },
  { t: 'Operations Coordinator', tag: 'Organized minds', icon: 'layers' },
  { t: 'Electrician (ON)', tag: 'Apprenticeship', icon: 'zap' }
]

const TRUST_STRIP: [string, string][] = [
  ['Real roles, ranked', 'Matched from an occupation + skills graph, not a vibe.'],
  ['Source-backed', 'Every wage and requirement shows where it came from.'],
  ['Built to follow through', 'A checkable, week-by-week roadmap — not a score.']
]

const COMPARE: { title: string; icon: string; highlight: boolean; items: string[] }[] = [
  {
    title: 'Going it alone',
    icon: 'compass',
    highlight: false,
    items: [
      'Endless tabs and conflicting advice',
      'No idea which skills actually matter',
      'Easy to stall after week one'
    ]
  },
  {
    title: 'Generic AI advice',
    icon: 'message',
    highlight: false,
    items: [
      'Confident-sounding, often made up',
      'No sources behind the numbers',
      'Same answer for everyone'
    ]
  },
  {
    title: 'CareerHeap',
    icon: 'layers',
    highlight: true,
    items: [
      'Real roles ranked from an occupation graph',
      'Every wage and rule traced to a source',
      'A week-by-week plan you check off'
    ]
  }
]

const PLANNER_HREF = '/tools/career-switch-planner'
const btnPrimaryLg =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-button transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px'
const btnOutlineLg =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-7 py-[15px] text-base font-semibold text-text-secondary transition-all duration-150 hover:border-accent hover:bg-accent-light hover:text-accent'

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="border-b border-border-light bg-bg-secondary" style={{ padding: '88px 0 64px' }}>
        <div className="mx-auto flex max-w-content flex-col items-center gap-[26px] px-4 text-center sm:px-6">
          <span className="anim-up inline-flex items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
            <Icon name="sparkle" size={14} fill /> Canada-first career planning
          </span>

          <h1
            className="anim-up max-w-[820px] font-extrabold leading-[1.08]"
            style={{ fontSize: 'clamp(34px, 5.2vw, 56px)', animationDelay: '.05s' }}
          >
            No experience yet?
            <br />
            <span className="text-accent">Here&apos;s your exact path in.</span>
          </h1>

          <p
            className="anim-up max-w-[600px] text-[18px] leading-[1.65] text-text-secondary"
            style={{ animationDelay: '.1s' }}
          >
            Tell CareerHeap where you are today. Get matched to real roles, see the skills that actually
            get you hired, and follow a week-by-week plan — with every number traced to a source.
          </p>

          <div className="anim-up flex flex-wrap justify-center gap-3.5" style={{ animationDelay: '.15s' }}>
            <Link href={PLANNER_HREF} className={btnPrimaryLg}>
              <Icon name="rocket" size={18} /> Build my plan — free
            </Link>
            <Link href={PLANNER_HREF} className={btnOutlineLg}>
              See a sample plan
            </Link>
          </div>

          <div className="anim-up flex items-center gap-2 text-[13.5px] text-text-tertiary" style={{ animationDelay: '.2s' }}>
            <Icon name="check" size={15} className="text-success" /> No résumé required &nbsp;·&nbsp; 4-minute
            setup &nbsp;·&nbsp; built for zero-experience starts
          </div>

          {/* trust strip */}
          <div className="anim-up grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-3" style={{ marginTop: 18, animationDelay: '.25s' }}>
            {TRUST_STRIP.map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border-light bg-surface p-4 text-left shadow-card">
                <p className="text-[11.5px] font-bold uppercase tracking-[1px] text-accent">{t}</p>
                <p className="mt-[7px] text-[13.5px] leading-[1.6] text-text-secondary">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '72px 0 84px' }}>
        <div className="mx-auto flex max-w-content flex-col items-center gap-12 px-4 sm:px-6">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2.5 font-extrabold" style={{ fontSize: 'clamp(26px,3.5vw,34px)' }}>
              Three steps from &ldquo;no idea&rdquo; to a plan you&apos;ll actually run
            </h2>
          </div>
          <div className="grid w-full grid-cols-1 gap-[22px] md:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="anim-up rounded-lg border border-border-light bg-surface p-7 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-md bg-accent-light text-accent">
                    <Icon name={s.icon} size={22} />
                  </span>
                  <span className="text-[30px] font-extrabold tracking-[-0.04em] text-border">{s.n}</span>
                </div>
                <h3 className="mt-5 text-[19px] font-bold">{s.t}</h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.65] text-text-secondary">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR PATHWAYS */}
      <section style={{ padding: '20px 0 88px' }}>
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="mb-7">
            <p className="eyebrow">Popular first-role pathways</p>
            <h2 className="mt-2.5 font-extrabold" style={{ fontSize: 'clamp(24px,3vw,30px)' }}>
              Starting points other beginners chose
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
            {PATHWAYS.map((p) => (
              <Link
                key={p.t}
                href={PLANNER_HREF}
                className="anim-up rounded-lg border border-border-light bg-surface p-[18px] text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel"
              >
                <span className="grid h-[38px] w-[38px] place-items-center rounded-md bg-[#e3f7f6] text-[#0a7f7e]">
                  <Icon name={p.icon} size={19} />
                </span>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[1px] text-accent">{p.tag}</p>
                <p className="mt-1.5 text-[15.5px] font-bold leading-[1.3]">{p.t}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CAREERHEAP */}
      <section style={{ padding: '0 0 88px' }}>
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="text-center">
            <p className="eyebrow">Why CareerHeap</p>
            <h2 className="mt-2.5 font-extrabold" style={{ fontSize: 'clamp(26px,3.5vw,34px)' }}>
              A real plan beats a pep talk
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {COMPARE.map((col) => (
              <div
                key={col.title}
                className="rounded-lg bg-surface p-7"
                style={{
                  border: col.highlight ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-light)',
                  boxShadow: col.highlight ? '0 16px 40px rgba(36,93,255,0.12)' : 'var(--sh-card, 0 6px 20px rgba(12,20,37,0.06))',
                  background: col.highlight ? 'var(--color-accent-soft, #f2f6ff)' : undefined
                }}
              >
                <span
                  className={`grid h-[42px] w-[42px] place-items-center rounded-md ${
                    col.highlight ? 'bg-accent text-white' : 'bg-bg-secondary text-text-tertiary'
                  }`}
                >
                  <Icon name={col.icon} size={20} fill={col.highlight} />
                </span>
                <h3 className="mt-4 text-[17px] font-bold">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] leading-[1.5]">
                      {col.highlight ? (
                        <span className="mt-0.5 shrink-0 text-success">
                          <Icon name="checkCircle" size={16} />
                        </span>
                      ) : (
                        <span className="mt-0.5 shrink-0 text-text-tertiary">
                          <Icon name="x" size={15} />
                        </span>
                      )}
                      <span className={col.highlight ? 'text-text-primary' : 'text-text-secondary'}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-7 max-w-[560px] text-center text-[13px] leading-[1.6] text-text-tertiary">
            We don&apos;t show testimonials we haven&apos;t earned yet. As real outcomes come in, they&apos;ll
            appear here — sourced and dated, like everything else.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 0 88px' }}>
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-xl bg-bg-dark text-center" style={{ padding: '56px 40px' }}>
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 80% -20%, rgba(36,93,255,0.4), transparent 50%), radial-gradient(circle at 0% 120%, rgba(14,165,164,0.25), transparent 45%)'
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-[620px] font-extrabold text-white" style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>
                You don&apos;t need experience. You need a path.
              </h2>
              <p className="mx-auto mt-3.5 max-w-[480px] text-[16.5px] leading-[1.6] text-text-on-dark-muted">
                Build your first plan in four minutes. Free, honest, and entirely yours.
              </p>
              <Link href={PLANNER_HREF} className={`${btnPrimaryLg} mt-[26px]`}>
                <Icon name="rocket" size={18} /> Build my plan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
