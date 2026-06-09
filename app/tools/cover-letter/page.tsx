'use client'

import { Suspense, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  FreeMeter,
  GeneratingCard,
  ToolHero,
  ToolPaywall,
  ToolTopBar,
  useToolRun
} from '@/components/tools/ToolKit'
import type { CoverLetter } from '@/lib/server/toolGeneration'

const COVER_SAMPLE_JOB = `Junior Data Analyst — Toronto, ON
We're looking for someone curious and detail-oriented to turn data into decisions. You'll write SQL, build dashboards, and share findings with the team. No senior experience required — a portfolio and clear thinking matter most.`

function CoverLetterInner() {
  const { stage, setStage, result, isPro, usesRemaining, error, locked, run, signedIn } =
    useToolRun<CoverLetter>('cover-letter')
  const [job, setJob] = useState('')
  const [role, setRole] = useState('Junior Data Analyst')
  const [company, setCompany] = useState('')
  const [background, setBackground] = useState('')
  const [copied, setCopied] = useState(false)

  const copyLetter = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(`${result.opening}\n\n${result.body}\n\n${result.closing}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="proto" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: 60 }}>
      <ToolTopBar />
      <div className="wrap wrap-tool" style={{ paddingTop: 40 }}>
        <ToolHero
          icon="book"
          badge="Cover Letter Writer"
          title="A focused cover letter in one minute"
          sub="Paste the posting and we’ll draft a letter built from your real background — no clichés, no filler."
        />

        {stage === 'input' && (
          <div className="card anim-up" style={{ marginTop: 28, padding: 'clamp(20px,4vw,30px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <span className="label">Role</span>
                <input className="field" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <span className="label">Company (optional)</span>
                <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Inc." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span className="label" style={{ marginBottom: 0 }}>Paste the job posting</span>
              <button
                onClick={() => setJob(COVER_SAMPLE_JOB)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Use a sample
              </button>
            </div>
            <textarea
              className="field"
              rows={6}
              style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.6 }}
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Paste the full job description here…"
            />
            <span className="label" style={{ marginTop: 14 }}>Your background (optional)</span>
            <textarea
              className="field"
              rows={3}
              style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.6 }}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="A few lines about your experience so the letter stays true to you…"
            />
            {error && (
              <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{error}</p>
            )}
            {locked && <div style={{ marginTop: 14 }}><ToolPaywall count={2} label="cover letter" /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                disabled={job.trim().length < 30}
                onClick={() => run({ role, company, jobPosting: job, background })}
              >
                <Icon name="sparkle" size={17} fill /> {signedIn ? 'Write my cover letter' : 'Sign in to write'}
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                {isPro ? 'Pro · unlimited' : 'Free preview · opening only'}
              </span>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <GeneratingCard title="Drafting your letter…" detail={`Matching your background to what ${role || 'the posting'} asks for.`} />
        )}

        {stage === 'result' && result && (
          <div className="anim-up" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isPro && <FreeMeter usesRemaining={usesRemaining} />}
            <div className="card" style={{ padding: 'clamp(22px,4vw,32px)' }}>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
                {result.opening}
              </div>
              {isPro ? (
                <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', marginTop: 16 }}>
                  {result.body}
                  {'\n\n'}
                  {result.closing}
                </div>
              ) : (
                <div style={{ position: 'relative', marginTop: 8 }}>
                  <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', filter: 'blur(5px)', userSelect: 'none', maxHeight: 130, overflow: 'hidden' }}>
                    {result.body}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'end center', background: 'linear-gradient(180deg, transparent, var(--surface) 75%)' }} />
                </div>
              )}
            </div>
            {isPro ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={copyLetter}>
                  <Icon name={copied ? 'check' : 'download'} size={16} /> {copied ? 'Copied' : 'Copy letter'}
                </button>
                <button className="btn btn-outline" onClick={() => setStage('input')}>
                  <Icon name="refresh" size={16} /> New letter
                </button>
              </div>
            ) : (
              <ToolPaywall count={2} label="cover letter" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={null}>
      <CoverLetterInner />
    </Suspense>
  )
}
