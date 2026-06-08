'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/lib/auth/context'

/* ============================================================
   CareerHeap — Résumé Builder / Editor (ported from prototype)
   Live editable sections + preview + templates + print/PDF (Pro)
   ============================================================ */

type Exp = { id: string; role: string; org: string; dates: string; bullets: string[] }
type Edu = { id: string; school: string; credential: string; dates: string }
type ResumeData = {
  name: string
  title: string
  email: string
  phone: string
  location: string
  links: string
  summary: string
  experience: Exp[]
  education: Edu[]
  skills: string[]
}
type TemplateId = 'professional' | 'classic' | 'modern'

const rid = (p: string) => p + Math.random().toString(36).slice(2, 7)
function blankExp(): Exp {
  return { id: rid('x'), role: '', org: '', dates: '', bullets: [''] }
}
function blankEdu(): Edu {
  return { id: rid('e'), school: '', credential: '', dates: '' }
}

function buildInitialResume(): ResumeData {
  return {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    links: '',
    summary: '',
    experience: [blankExp()],
    education: [blankEdu()],
    skills: []
  }
}

const SKILL_SUGGESTIONS = [
  'Communication',
  'Teamwork',
  'Excel / Sheets',
  'Customer service',
  'SQL',
  'Project coordination',
  'Time management',
  'Problem solving'
]

/* ---------- pre-filled, switchable templates ---------- */
const TEMPLATE_PRESETS: Array<{ id: string; name: string; desc: string; style: string; data: ResumeData }> = [
  {
    id: 'student-analyst',
    name: 'Student → First Role',
    desc: 'Entry-level, portfolio-forward',
    style: 'modern',
    data: {
      name: 'Maya Patel',
      title: 'Aspiring Data Analyst',
      email: 'maya.patel@email.com',
      phone: '(416) 555-0142',
      location: 'Toronto, ON',
      links: 'mayapatel.dev · linkedin.com/in/mayap',
      summary:
        'Detail-oriented analyst-in-training with hands-on SQL and a published dashboard project. Comfortable turning messy data into a clear recommendation.',
      experience: [
        { id: 'sa1', role: 'Sales Associate', org: 'Retail Co.', dates: '2024 – 2026', bullets: ['Resolved 30+ customer issues per shift with a 96% satisfaction rate', 'Handled $4k+ in daily transactions with zero reconciliation errors'] },
        { id: 'sa2', role: 'Treasurer', org: 'Campus Business Club', dates: '2025', bullets: ['Tracked a $4,200 annual budget across 30 events in a spreadsheet model still used today'] }
      ],
      education: [{ id: 'se1', credential: 'Bachelor of Commerce (in progress)', school: 'University of Toronto', dates: 'Expected 2027' }],
      skills: ['SQL', 'Excel / Sheets', 'Tableau', 'Customer service', 'Communication', 'Teamwork']
    }
  },
  {
    id: 'switcher-ops',
    name: 'Career Switcher → Ops',
    desc: 'Transferable-skill focused',
    style: 'classic',
    data: {
      name: 'Jordan Lee',
      title: 'Operations Coordinator',
      email: 'jordan.lee@email.com',
      phone: '(604) 555-0188',
      location: 'Vancouver, BC',
      links: 'linkedin.com/in/jordanlee',
      summary:
        'Retail shift lead moving into operations. Years of scheduling, inventory, and frontline problem-solving — now paired with spreadsheet and process tooling.',
      experience: [
        { id: 'so1', role: 'Shift Supervisor', org: 'Retail Co.', dates: '2023 – 2026', bullets: ['Scheduled a 12-person team and cut overtime 18% by rebalancing shifts', 'Owned weekly inventory counts and reduced stock discrepancies to under 1%'] },
        { id: 'so2', role: 'Sales Associate', org: 'Retail Co.', dates: '2021 – 2023', bullets: ['Top customer-satisfaction score in the store for four consecutive quarters'] }
      ],
      education: [{ id: 'eo1', credential: 'Business Administration Diploma', school: 'Langara College', dates: '2021' }],
      skills: ['Scheduling', 'Inventory management', 'Excel', 'Process documentation', 'Asana', 'Stakeholder communication']
    }
  },
  {
    id: 'trades-electrician',
    name: 'Trades → Apprentice',
    desc: 'Safety + hands-on framing',
    style: 'classic',
    data: {
      name: 'Sam Okafor',
      title: 'Apprentice Electrician',
      email: 'sam.okafor@email.com',
      phone: '(587) 555-0167',
      location: 'Calgary, AB',
      links: '',
      summary:
        'Line cook transitioning into the electrical trade. Fast, safety-first, and reliable under pressure — with safety tickets in hand and a sponsor-ready attitude.',
      experience: [
        { id: 'te1', role: 'Line Cook', org: 'Restaurant Group', dates: '2022 – 2026', bullets: ['Ran a high-volume station through 6-hour dinner rushes with zero safety incidents', 'Maintained tools and equipment to strict food-safety standards'] }
      ],
      education: [{ id: 'ee1', credential: 'WHMIS + Working at Heights (certified)', school: 'Approved provider', dates: '2026' }],
      skills: ['Hand & power tools', 'Workplace safety', 'Working under pressure', 'Reliability', 'Teamwork']
    }
  }
]

/* ---------- skills chip input ---------- */
function SkillsInput({ skills, setSkills }: { skills: string[]; setSkills: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = (s: string) => {
    const v = s.trim()
    if (v && !skills.includes(v)) setSkills([...skills, v])
    setDraft('')
  }
  const remove = (s: string) => setSkills(skills.filter((x) => x !== s))
  const unused = SKILL_SUGGESTIONS.filter((s) => !skills.includes(s))
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 14, minHeight: 4 }}>
        {skills.map((s) => (
          <span key={s} className="chip chip-removable" style={{ cursor: 'default' }}>
            {s}
            <button onClick={() => remove(s)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', color: 'inherit', opacity: 0.7 }}>
              <Icon name="x" size={14} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          className="field"
          placeholder="Type a skill and press Enter…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
        />
        <button className="btn btn-outline" style={{ flexShrink: 0 }} onClick={() => add(draft)} disabled={!draft.trim()}>
          <Icon name="plus" size={16} /> Add
        </button>
      </div>
      {unused.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="help" style={{ marginBottom: 9 }}>Common skills — tap to add:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unused.slice(0, 8).map((s) => (
              <button key={s} className="chip" style={{ padding: '7px 12px', fontSize: 13 }} onClick={() => add(s)}>
                <Icon name="plus" size={13} /> {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- preview blocks ---------- */
function ExpBlock({ e }: { e: Exp }) {
  if (!e.role && !e.org) return null
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: '#1f1f1f' }}>
          <strong style={{ fontWeight: 700 }}>{e.role || 'Role'}</strong>
          {e.org ? <span style={{ color: '#555' }}>{'  ·  ' + e.org}</span> : null}
        </span>
        <span style={{ color: '#777', fontSize: 10.5, whiteSpace: 'nowrap', fontStyle: 'italic' }}>{e.dates}</span>
      </div>
      <ul style={{ margin: '5px 0 0', padding: 0, listStyle: 'none' }}>
        {e.bullets.filter(Boolean).map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, fontSize: 10.8, lineHeight: 1.5, color: '#3a3a3a', marginBottom: 3 }}>
            <span style={{ color: '#9a9a9a' }}>•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
function EduBlock({ e }: { e: Edu }) {
  if (!e.school && !e.credential) return null
  return (
    <div style={{ marginBottom: 9, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
      <span style={{ fontSize: 11.5 }}>
        <strong style={{ fontWeight: 700, color: '#1f1f1f' }}>{e.credential || 'Credential'}</strong>
        {e.school ? <span style={{ color: '#555' }}>{' — ' + e.school}</span> : null}
      </span>
      <span style={{ color: '#777', fontSize: 10.5, whiteSpace: 'nowrap', fontStyle: 'italic' }}>{e.dates}</span>
    </div>
  )
}

function ResumePreview({ r, template }: { r: ResumeData; template: TemplateId }) {
  const modern = template === 'modern'
  const professional = template === 'professional'
  // Plain render helper (not a component) so it never trips static-components.
  const Section = (title: string, children: React.ReactNode) => (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: modern ? 'var(--accent)' : '#1f1f1f', borderBottom: '1px solid ' + (modern ? '#e7ebf3' : '#d7d7d7'), paddingBottom: 5, marginBottom: 11 }}>
        {title}
      </h3>
      {children}
    </section>
  )
  const contact = [
    { icon: 'pin', text: r.location },
    { icon: 'mail', text: r.email },
    { icon: 'phone', text: r.phone },
    { icon: 'link', text: r.links }
  ].filter((c) => c.text)
  const bodyP: React.CSSProperties = { margin: 0, fontSize: 10.8, lineHeight: 1.55, color: '#3a3a3a' }
  return (
    <div
      className="rb-paper"
      style={{
        background: '#fff',
        color: '#2b2b2b',
        fontFamily: modern || professional ? 'Inter, system-ui, sans-serif' : 'Georgia, "Times New Roman", serif',
        display: modern ? 'grid' : 'block',
        gridTemplateColumns: modern ? '34% 66%' : 'none',
        overflow: 'hidden',
        aspectRatio: '8.5 / 11'
      }}
    >
      {modern ? (
        <>
          <aside style={{ background: 'var(--bg-dark)', color: '#fff', padding: '34px 26px', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}>
            <h1 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.15, color: '#fff', letterSpacing: '-0.01em' }}>{r.name || 'Your Name'}</h1>
            {r.title && <p style={{ fontSize: 12, color: '#9bb6ff', marginTop: 6, fontWeight: 600 }}>{r.title}</p>}
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 10.5, color: '#c2cce0' }}>
              {contact.map((c, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={c.icon} size={11} style={{ color: '#7e93b8', flexShrink: 0 }} /> {c.text}
                </span>
              ))}
            </div>
            {r.skills.length > 0 && (
              <div style={{ marginTop: 26 }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#fff', marginBottom: 11 }}>Skills</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {r.skills.map((s, i) => (
                    <span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.13)', padding: '4px 9px', borderRadius: 5 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>
          <main style={{ padding: '34px 30px' }}>
            {r.summary && Section('Summary', <p style={bodyP}>{r.summary}</p>)}
            {Section('Experience', r.experience.map((e) => <ExpBlock key={e.id} e={e} />))}
            {Section('Education', r.education.map((e) => <EduBlock key={e.id} e={e} />))}
          </main>
        </>
      ) : professional ? (
        <div style={{ padding: '44px 50px' }}>
          <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: 13 }}>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{r.name || 'Your Name'}</h1>
            {r.title && <p style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>{r.title}</p>}
            {contact.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '5px 16px', alignItems: 'center', fontSize: 10.5, color: '#555' }}>
                {contact.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name={c.icon} size={11} style={{ opacity: 0.7, flexShrink: 0 }} /> {c.text}
                  </span>
                ))}
              </div>
            )}
          </div>
          {r.summary && <p style={{ ...bodyP, marginTop: 14 }}>{r.summary}</p>}
          {r.skills.length > 0 &&
            Section(
              'Skills & Certifications',
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px' }}>
                {r.skills.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 10.8, lineHeight: 1.45, color: '#3a3a3a' }}>
                    <span style={{ color: 'var(--accent)' }}>▪</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          {Section('Experience', r.experience.map((e) => <ExpBlock key={e.id} e={e} />))}
          {Section('Education', r.education.map((e) => <EduBlock key={e.id} e={e} />))}
        </div>
      ) : (
        <div style={{ padding: '52px 54px' }}>
          <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1.5px solid #1f1f1f' }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '0.4px', color: '#1a1a1a' }}>{r.name || 'Your Name'}</h1>
            {r.title && <p style={{ fontSize: 13, color: '#5a5a5a', marginTop: 5, fontStyle: 'italic' }}>{r.title}</p>}
            {contact.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '5px 18px', justifyContent: 'center', alignItems: 'center', fontSize: 10.5, color: '#5a5a5a' }}>
                {contact.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name={c.icon} size={11} style={{ opacity: 0.7, flexShrink: 0 }} /> {c.text}
                  </span>
                ))}
              </div>
            )}
          </div>
          {r.summary && Section('Summary', <p style={bodyP}>{r.summary}</p>)}
          {Section('Experience', r.experience.map((e) => <ExpBlock key={e.id} e={e} />))}
          {Section('Education', r.education.map((e) => <EduBlock key={e.id} e={e} />))}
          {r.skills.length > 0 && Section('Skills', <p style={bodyP}>{r.skills.join('   ·   ')}</p>)}
        </div>
      )}
    </div>
  )
}

function RBField({ label, value, onChange, placeholder, area }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean }) {
  const control = area ? (
    <textarea className="field" rows={3} style={{ resize: 'vertical', fontSize: 13.5 }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ) : (
    <input className="field" style={{ fontSize: 13.5, padding: '10px 12px' }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  )
  return (
    <div style={{ marginBottom: 12 }}>
      {label ? (
        <label className="label" style={{ fontSize: 12.5, marginBottom: 5 }}>
          <span style={{ display: 'block', marginBottom: 5 }}>{label}</span>
          {control}
        </label>
      ) : (
        control
      )}
    </div>
  )
}

const RB_TIPS: Record<string, string[]> = {
  contact: ['Use a professional email and just your city — not a full street address.', 'Add a portfolio or LinkedIn link recruiters can click.'],
  summary: ['2–3 lines: lead with the role you want and one concrete proof point.', 'Skip "hardworking team player" — show it with a result instead.'],
  experience: ['Start each bullet with a verb; end with a number or outcome.', 'Most recent role first, 3–5 bullets each.'],
  education: ['List most recent or in-progress first.', 'Early-career? Add relevant coursework or certifications.'],
  skills: ['Mirror the exact terms from the job posting.', 'Lead with tools and hard skills; drop the obvious ones.']
}

const RB_KEY = 'careerheap_resume_v1'

export default function ResumeBuilderPage() {
  const router = useRouter()
  const { plan } = useAuth()
  const isPro = plan === 'pro' || plan === 'lifetime'
  const upgrade = () => router.push('/pricing')

  const loadSaved = (): { r?: ResumeData; template?: TemplateId } | null => {
    try {
      return JSON.parse(window.localStorage.getItem(RB_KEY) || 'null')
    } catch {
      return null
    }
  }
  const [r, setR] = useState<ResumeData>(() => {
    const s = loadSaved()
    return s && s.r ? s.r : buildInitialResume()
  })
  const [template, setTemplate] = useState<TemplateId>(() => {
    const s = loadSaved()
    return s && s.template ? s.template : 'professional'
  })
  // Persist to localStorage whenever the résumé or template changes. This is a
  // pure external-system sync (no setState), so it never cascades renders.
  useEffect(() => {
    try {
      window.localStorage.setItem(RB_KEY, JSON.stringify({ r, template }))
    } catch {
      /* ignore */
    }
  }, [r, template])
  const [tab] = useState<'edit' | 'preview'>('edit')
  const set = (k: keyof ResumeData, v: ResumeData[keyof ResumeData]) => setR((p) => ({ ...p, [k]: v }) as ResumeData)
  const [section, setSection] = useState('contact')
  const [jobDesc, setJobDesc] = useState('')

  const setExp = (id: string, patch: Partial<Exp>) => setR((p) => ({ ...p, experience: p.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const setEdu = (id: string, patch: Partial<Edu>) => setR((p) => ({ ...p, education: p.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const moveExp = (i: number, d: number) =>
    setR((p) => {
      const a = [...p.experience]
      const j = i + d
      if (j < 0 || j >= a.length) return p
      ;[a[i], a[j]] = [a[j], a[i]]
      return { ...p, experience: a }
    })

  const resumeHasContent = (rr: ResumeData) =>
    !!(rr && (rr.name || rr.title || rr.email || rr.summary || rr.skills.length || rr.experience.some((e) => e.role || e.org || e.bullets.some(Boolean))))
  const [confirmAsk, setConfirmAsk] = useState<{ message: string; action: () => void } | null>(null)
  const confirmThen = (message: string, action: () => void) => {
    if (resumeHasContent(r)) setConfirmAsk({ message, action })
    else action()
  }
  const applyPreset = (preset: (typeof TEMPLATE_PRESETS)[number]) =>
    confirmThen('Loading this example will replace the details you’ve entered. Your chosen layout stays the same.', () => {
      setR(JSON.parse(JSON.stringify(preset.data)))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  const startFresh = () =>
    confirmThen('This clears the résumé and starts a blank one. This can’t be undone.', () => {
      setR(buildInitialResume())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })

  const download = () => {
    if (!isPro) {
      upgrade()
      return
    }
    document.body.classList.add('rb-printing')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('rb-printing')
    }, 80)
  }

  return (
    <div className="proto" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {confirmAsk && (
        <div onClick={() => setConfirmAsk(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(10,19,36,0.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="anim-up" style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--sh-panel)', padding: 26 }}>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--warning-light)', color: 'var(--warning)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="refresh" size={20} /></span>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>Replace what you’ve entered?</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 7, lineHeight: 1.6 }}>{confirmAsk.message}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmAsk(null)}>Keep editing</button>
              <button className="btn btn-primary btn-sm" onClick={() => { const a = confirmAsk.action; setConfirmAsk(null); a() }}>Replace it</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media print { body.rb-printing * { visibility: hidden !important; } body.rb-printing .rb-paper, body.rb-printing .rb-paper * { visibility: visible !important; } body.rb-printing .rb-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; } @page { margin: 12mm; } }`}</style>

      <div className="print-hidden" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="wrap" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => router.push('/tools')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <Icon name="arrowLeft" size={16} /> Tools
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}><Icon name="check" size={13} style={{ color: 'var(--success)' }} /> Auto-saves</span>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/tools/resume-analyzer')}><Icon name="award" size={15} /> <span>Analyze</span></button>
            <button className="btn btn-primary btn-sm" onClick={download}><Icon name="download" size={15} /> <span>Download PDF{!isPro ? ' (Pro)' : ''}</span></button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <span className="badge badge-teal"><Icon name="book" size={13} /> Résumé Builder</span>
            <h1 style={{ fontSize: 'clamp(22px,3vw,28px)', fontWeight: 800, marginTop: 10 }}>Build a clean, recruiter-ready résumé</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>Template</span>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--pill)', padding: 3 }}>
              {([['professional', 'Professional', true], ['classic', 'Classic', true], ['modern', 'Modern', isPro]] as Array<[TemplateId, string, boolean]>).map(([k, label, allowed]) => (
                <button key={k} onClick={() => (allowed ? setTemplate(k) : upgrade())} style={{ border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 'var(--pill)', fontSize: 12.5, fontWeight: 600, background: template === k ? 'var(--accent)' : 'transparent', color: template === k ? '#fff' : 'var(--text-secondary)' }}>
                  {label}{!allowed ? ' 🔒' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* template gallery */}
        <div className="print-hidden" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Load example content</p>
            <button className="btn btn-outline btn-sm" onClick={startFresh}><Icon name="refresh" size={14} /> Start fresh</button>
          </div>
          <div className="tmpl-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {TEMPLATE_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)} className="card" style={{ textAlign: 'left', padding: 16, display: 'flex', gap: 13, alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: p.style === 'modern' ? 'var(--bg-dark)' : 'var(--accent-light)', color: p.style === 'modern' ? '#9bb6ff' : 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="book" size={19} /></span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rb-sectionbar print-hidden" style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
          {[['contact', 'Contact', 'pin'], ['summary', 'Summary', 'lightbulb'], ['experience', 'Experience', 'briefcase'], ['education', 'Education', 'grad'], ['skills', 'Skills', 'star']].map(([id, label, icon]) => (
            <button key={id} onClick={() => setSection(id)} className={'chip' + (section === id ? ' chip-on' : '')} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13 }}><Icon name={icon} size={14} /> {label}</button>
          ))}
        </div>

        <div className="rb-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 22, alignItems: 'start' }}>
          {/* EDITOR */}
          <div className="rb-editor print-hidden" style={{ display: tab === 'preview' ? 'none' : 'block' }}>
            <div id="rb-contact" className="card" style={{ padding: 22, display: section === 'contact' ? 'block' : 'none' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Contact</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <RBField label="Full name" value={r.name} onChange={(v) => set('name', v)} placeholder="Maya Patel" />
                <RBField label="Headline" value={r.title} onChange={(v) => set('title', v)} placeholder="Aspiring Data Analyst" />
                <RBField label="Email" value={r.email} onChange={(v) => set('email', v)} placeholder="you@email.com" />
                <RBField label="Phone" value={r.phone} onChange={(v) => set('phone', v)} placeholder="(416) 555-0199" />
                <RBField label="Location" value={r.location} onChange={(v) => set('location', v)} placeholder="Toronto, ON" />
                <RBField label="Links" value={r.links} onChange={(v) => set('links', v)} placeholder="portfolio · linkedin" />
              </div>
            </div>

            <div id="rb-summary" className="card" style={{ padding: 22, display: section === 'summary' ? 'block' : 'none' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Summary</h2>
              <p className="help" style={{ marginBottom: 10 }}>2–3 lines. Lead with your target role and strongest proof.</p>
              <RBField value={r.summary} onChange={(v) => set('summary', v)} area placeholder="Detail-oriented analyst-in-training with hands-on SQL and a published dashboard project…" />
            </div>

            <div id="rb-experience" className="card" style={{ padding: 22, display: section === 'experience' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>Experience</h2>
                <button className="btn btn-outline btn-sm" onClick={() => setR((p) => ({ ...p, experience: [...p.experience, blankExp()] }))}><Icon name="plus" size={14} /> Add</button>
              </div>
              {r.experience.map((e, i) => (
                <div key={e.id} style={{ padding: 14, border: '1px solid var(--border-light)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
                    <button onClick={() => moveExp(i, -1)} disabled={i === 0} className="btn btn-ghost btn-sm" style={{ padding: 5, opacity: i === 0 ? 0.3 : 1 }} title="Move up"><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
                    <button onClick={() => moveExp(i, 1)} disabled={i === r.experience.length - 1} className="btn btn-ghost btn-sm" style={{ padding: 5, opacity: i === r.experience.length - 1 ? 0.3 : 1 }} title="Move down"><Icon name="chevron" size={14} /></button>
                    <button onClick={() => setR((p) => ({ ...p, experience: p.experience.filter((x) => x.id !== e.id) }))} className="btn btn-ghost btn-sm" style={{ padding: 5, color: 'var(--error)' }} title="Remove"><Icon name="x" size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <RBField label="Role" value={e.role} onChange={(v) => setExp(e.id, { role: v })} placeholder="Sales Associate" />
                    <RBField label="Organization" value={e.org} onChange={(v) => setExp(e.id, { org: v })} placeholder="Retail Co." />
                  </div>
                  <RBField label="Dates" value={e.dates} onChange={(v) => setExp(e.id, { dates: v })} placeholder="2024 – 2026" />
                  <p className="label" style={{ fontSize: 12.5, marginBottom: 5 }}>Bullet points</p>
                  {e.bullets.map((b, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input className="field" style={{ fontSize: 13, padding: '8px 11px' }} value={b} onChange={(ev) => setExp(e.id, { bullets: e.bullets.map((x, k) => (k === bi ? ev.target.value : x)) })} placeholder="Resolved 30+ customer issues per shift with a 96% satisfaction rate" />
                      <button onClick={() => setExp(e.id, { bullets: e.bullets.filter((_, k) => k !== bi) })} className="btn btn-ghost btn-sm" style={{ padding: 7, color: 'var(--text-tertiary)' }}><Icon name="x" size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setExp(e.id, { bullets: [...e.bullets, ''] })} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="plus" size={13} /> Add bullet</button>
                </div>
              ))}
            </div>

            <div id="rb-education" className="card" style={{ padding: 22, display: section === 'education' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>Education</h2>
                <button className="btn btn-outline btn-sm" onClick={() => setR((p) => ({ ...p, education: [...p.education, blankEdu()] }))}><Icon name="plus" size={14} /> Add</button>
              </div>
              {r.education.map((e) => (
                <div key={e.id} style={{ padding: 14, border: '1px solid var(--border-light)', borderRadius: 'var(--r-md)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <button onClick={() => setR((p) => ({ ...p, education: p.education.filter((x) => x.id !== e.id) }))} className="btn btn-ghost btn-sm" style={{ padding: 5, color: 'var(--error)' }}><Icon name="x" size={14} /></button>
                  </div>
                  <RBField label="Credential" value={e.credential} onChange={(v) => setEdu(e.id, { credential: v })} placeholder="Bachelor of Commerce (in progress)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <RBField label="School" value={e.school} onChange={(v) => setEdu(e.id, { school: v })} placeholder="University" />
                    <RBField label="Dates" value={e.dates} onChange={(v) => setEdu(e.id, { dates: v })} placeholder="Expected 2027" />
                  </div>
                </div>
              ))}
            </div>

            <div id="rb-skills" className="card" style={{ padding: 22, display: section === 'skills' ? 'block' : 'none' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Skills</h2>
              <SkillsInput skills={r.skills} setSkills={(v) => set('skills', v)} />
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const checks: Array<[string, boolean]> = [
                  ['Name', !!r.name],
                  ['Headline', !!r.title],
                  ['Contact', !!(r.email || r.phone || r.location)],
                  ['Summary', (r.summary || '').trim().length > 20],
                  ['Experience', r.experience.some((e) => e.role && e.bullets.some(Boolean))],
                  ['Education', r.education.some((e) => e.credential || e.school)],
                  ['Skills (3+)', r.skills.length >= 3]
                ]
                const pct = Math.round((checks.filter((c) => c[1]).length / checks.length) * 100)
                return (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 800 }}>Résumé strength</h3>
                      <span style={{ fontSize: 15, fontWeight: 800, color: pct >= 80 ? 'var(--success)' : 'var(--accent)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: pct >= 80 ? 'var(--success)' : 'var(--accent)', borderRadius: 5, transition: 'width .3s' }} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginTop: 15 }}>
                      {checks.map(([label, ok], i) => (
                        <button key={i} onClick={() => setSection(['contact', 'contact', 'contact', 'summary', 'experience', 'education', 'skills'][i])} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: ok ? 'var(--text-secondary)' : 'var(--text-tertiary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ color: ok ? 'var(--success)' : 'var(--border)', flexShrink: 0 }}><Icon name={ok ? 'checkCircle' : 'plus'} size={15} /></span>{label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <div className="card" style={{ padding: 20, background: 'var(--accent-soft)', boxShadow: 'none', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}><Icon name="lightbulb" size={16} style={{ color: 'var(--accent)' }} /><h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', textTransform: 'capitalize' }}>Tips · {section}</h3></div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(RB_TIPS[section] || []).map((tip, i) => (
                    <li key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>{tip}</li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon name="target" size={16} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>Keyword targeting</h3>
                </div>
                <p className="help" style={{ marginBottom: 10 }}>Paste a job posting — see which keywords your résumé already hits and what’s missing.</p>
                <textarea className="field" rows={4} style={{ resize: 'vertical', fontSize: 13 }} value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Paste the job description here…" />
                {jobDesc.trim().length > 20 &&
                  (() => {
                    const STOP = new Set(
                      'the and for with you your will are our that this have has from their they what who about into able role team teams work working strong ability years year job roles candidate experience skills must should preferred plus including new use using used within across help support more most other per via etc looking seeking skilled responsible responsibilities required requirements knowledge understanding excellent a an to of in on as or be is at by we it all can'.split(/\s+/)
                    )
                    const text = (
                      (r.summary || '') + ' ' + (r.title || '') + ' ' + r.skills.join(' ') + ' ' + r.experience.map((e) => e.role + ' ' + e.org + ' ' + e.bullets.join(' ')).join(' ') + ' ' + r.education.map((e) => (e.credential || '') + ' ' + (e.school || '')).join(' ')
                    ).toLowerCase()
                    const freq: Record<string, number> = {}
                    ;(jobDesc.toLowerCase().match(/[a-z][a-z+.#/-]{2,}/g) || []).forEach((raw) => {
                      const w = raw.replace(/^[.\-/]+|[.\-/]+$/g, '')
                      if (w.length >= 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
                    })
                    const kws = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 16)
                    const matched = kws.filter((k) => text.includes(k))
                    const missing = kws.filter((k) => !text.includes(k))
                    const pct = kws.length ? Math.round((matched.length / kws.length) * 100) : 0
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Keyword match</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--warning)' }}>{pct}%</span>
                        </div>
                        {matched.length > 0 && (
                          <>
                            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>In your résumé</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>{matched.map((k) => <span key={k} className="badge badge-success" style={{ fontSize: 11 }}><Icon name="check" size={11} /> {k}</span>)}</div>
                          </>
                        )}
                        {missing.length > 0 && (
                          <>
                            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Missing — tap to add to Skills</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{missing.map((k) => <button key={k} onClick={() => { if (!r.skills.includes(k)) set('skills', [...r.skills, k]) }} className="badge badge-warn" style={{ fontSize: 11, cursor: 'pointer', border: 'none' }}><Icon name="plus" size={11} /> {k}</button>)}</div>
                          </>
                        )}
                      </div>
                    )
                  })()}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => router.push('/tools/resume-analyzer')}><Icon name="award" size={15} /> Analyze</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={download}><Icon name="download" size={15} /> {isPro ? 'Download' : 'Download (Pro)'}</button>
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="rb-preview-wrap" style={{ position: 'sticky', top: 84 }}>
            <div style={{ background: 'linear-gradient(180deg, #e9edf4, #eef1f7)', borderRadius: 'var(--r-lg)', padding: 'clamp(14px, 3vw, 28px)', border: '1px solid var(--border-light)' }}>
              <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 12px 34px rgba(12,20,37,0.16), 0 2px 6px rgba(12,20,37,0.08)' }}>
                <ResumePreview r={r} template={template} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 10 }}>Live preview · updates as you type</p>
          </div>
        </div>
      </div>
    </div>
  )
}
