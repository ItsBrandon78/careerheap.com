'use client'

import { Suspense, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  FreeMeter,
  GeneratingCard,
  LockedItem,
  ScoreRing,
  ToolHero,
  ToolPaywall,
  ToolTopBar,
  useToolRun
} from '@/components/tools/ToolKit'
import type { ResumeAnalysis } from '@/lib/server/toolGeneration'

const SAMPLE_RESUME = `MAYA PATEL — Toronto, ON · maya@email.com · portfolio link

EXPERIENCE
Sales Associate, Retail Co (2024–2026)
- Responsible for handling customer transactions and resolving issues.
- Helped with store displays and inventory counts.

Treasurer, Campus Business Club (2025)
- Responsible for the club budget and reimbursements.

EDUCATION
Bachelor of Commerce (in progress), expected 2027

SKILLS
Excel, customer service, teamwork, communication`

function findingIcon(type: 'good' | 'improve') {
  if (type === 'good') return { name: 'checkCircle', color: 'var(--success)', bg: 'var(--success-light)' }
  return { name: 'lightbulb', color: 'var(--warning)', bg: 'var(--warning-light)' }
}

function ResumeAnalyzerInner() {
  const { stage, setStage, result, isPro, usesRemaining, error, locked, run, signedIn } =
    useToolRun<ResumeAnalysis>('resume-analyzer')
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')

  const a = result
  const freeFindings = a ? a.findings.slice(0, 2) : []
  const lockedFindings = a ? a.findings.slice(2) : []
  const visibleFindings = isPro ? a?.findings ?? [] : freeFindings

  return (
    <div className="proto" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: 60 }}>
      <ToolTopBar />
      <div className="wrap wrap-tool" style={{ paddingTop: 40 }}>
        <ToolHero
          icon="award"
          badge="Résumé Analyzer"
          title="See your résumé the way a recruiter does"
          sub="Paste your résumé and get an honest score, the keywords you’re missing, and the exact lines to rewrite."
        />

        {stage === 'input' && (
          <div className="card anim-up" style={{ marginTop: 28, padding: 'clamp(20px,4vw,30px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <span className="label">Target role (optional)</span>
                <input
                  className="field"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Junior Data Analyst"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span className="label" style={{ marginBottom: 0 }}>Paste your résumé text</span>
              <button
                onClick={() => setText(SAMPLE_RESUME)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Use a sample
              </button>
            </div>
            <textarea
              className="field"
              rows={10}
              style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.6 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full text of your résumé here…"
            />
            {error && (
              <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{error}</p>
            )}
            {locked && <div style={{ marginTop: 14 }}><ToolPaywall count={1} label="résumé analysis" /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                disabled={text.trim().length < 30}
                onClick={() => run({ resumeText: text, targetRole })}
              >
                <Icon name="zap" size={17} /> {signedIn ? 'Analyze my résumé' : 'Sign in to analyze'}
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                {isPro ? 'Pro · unlimited runs' : 'Honest score · preview results'}
              </span>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <GeneratingCard title="Reading your résumé…" detail="Scoring impact, scanning for keywords, checking ATS formatting." />
        )}

        {stage === 'result' && a && (
          <div className="anim-up" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {!isPro && <FreeMeter usesRemaining={usesRemaining} />}

            <div className="card" style={{ padding: 24, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing value={a.score} color={a.score >= 75 ? 'var(--success)' : 'var(--warning)'} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Résumé score</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{a.band}</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>{a.summary}</p>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Keyword match</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4 }}>Found in your résumé</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {a.keywords.matched.map((k) => (
                  <span key={k} className="badge badge-success" style={{ fontSize: 12.5 }}>
                    <Icon name="check" size={12} /> {k}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 16 }}>Missing — add these</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                {(isPro ? a.keywords.missing : a.keywords.missing.slice(0, 2)).map((k) => (
                  <span key={k} className="badge badge-warn" style={{ fontSize: 12.5 }}>
                    <Icon name="plus" size={12} /> {k}
                  </span>
                ))}
                {!isPro && a.keywords.missing.length > 2 && (
                  <span className="badge" style={{ fontSize: 12.5 }}>
                    <Icon name="lock" size={11} /> +{a.keywords.missing.length - 2} more
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>What to fix</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleFindings.map((f, i) => {
                  const ic = findingIcon(f.type)
                  return (
                    <div key={i} className="card-flat" style={{ padding: 18, border: '1px solid var(--border-light)', display: 'flex', gap: 14 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 9, background: ic.bg, color: ic.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name={ic.name} size={18} />
                      </span>
                      <div>
                        <p style={{ fontSize: 14.5, fontWeight: 700 }}>{f.title}</p>
                        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.6 }}>{f.detail}</p>
                      </div>
                    </div>
                  )
                })}
                {!isPro && lockedFindings.map((f, i) => <LockedItem key={i} title={f.title} />)}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Line-by-line rewrites</h3>
              {isPro ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {a.rewrites.map((r, i) => (
                    <div key={i} className="card" style={{ padding: 18 }}>
                      <p style={{ fontSize: 12.5, color: 'var(--error)', fontWeight: 600 }}>Before</p>
                      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4, textDecoration: 'line-through', opacity: 0.7 }}>{r.before}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--success)', fontWeight: 600, marginTop: 12 }}>After</p>
                      <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.55 }}>{r.after}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ToolPaywall count={a.rewrites.length + lockedFindings.length} label="résumé analysis" />
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setStage('input')}>
                <Icon name="refresh" size={16} /> Analyze another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumeAnalyzerPage() {
  return (
    <Suspense fallback={null}>
      <ResumeAnalyzerInner />
    </Suspense>
  )
}
