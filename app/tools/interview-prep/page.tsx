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
import type { InterviewPrep } from '@/lib/server/toolGeneration'

function InterviewPrepInner() {
  const { stage, setStage, result, isPro, usesRemaining, error, locked, run, signedIn } =
    useToolRun<InterviewPrep>('interview-prep')
  const [role, setRole] = useState('')
  const [open, setOpen] = useState(0)

  const qs = result?.questions ?? []
  const freeQs = qs.slice(0, 2)
  const lockedCount = Math.max(0, qs.length - 2)
  const visibleQs = isPro ? qs : freeQs

  return (
    <div className="proto" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: 60 }}>
      <ToolTopBar />
      <div className="wrap wrap-tool" style={{ paddingTop: 40 }}>
        <ToolHero
          icon="message"
          badge="Interview Q&A Prep"
          title="Walk in knowing what they’ll ask"
          sub="Get the questions most likely for your target role, with model answers shaped for someone making the leap."
        />

        {stage === 'input' && (
          <div className="card anim-up" style={{ marginTop: 28, padding: 'clamp(20px,4vw,30px)' }}>
            <span className="label">Target role</span>
            <input
              className="field"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Junior Data Analyst"
            />
            {error && (
              <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{error}</p>
            )}
            {locked && <div style={{ marginTop: 14 }}><ToolPaywall count={1} label="question set" /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={!role.trim()} onClick={() => run({ role })}>
                <Icon name="sparkle" size={17} fill /> {signedIn ? 'Generate questions' : 'Sign in to generate'}
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                {isPro ? 'Pro · unlimited' : '2 questions free · preview'}
              </span>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <GeneratingCard
            title="Building your question set…"
            detail={`Tailoring answers for a career-switcher into ${role || 'your target role'}.`}
          />
        )}

        {stage === 'result' && result && (
          <div className="anim-up" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isPro && <FreeMeter usesRemaining={usesRemaining} />}
            {visibleQs.map((item, i) => {
              const isOpen = open === i
              return (
                <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '18px 22px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-light)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 15.5, fontWeight: 700 }}>{item.q}</span>
                    </span>
                    <Icon name="chevron" size={18} style={{ color: 'var(--accent)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {isOpen && (
                    <div className="anim-in" style={{ padding: '0 22px 20px 60px' }}>
                      <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.a}</p>
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12, padding: '12px 14px', background: 'var(--teal-light)', borderRadius: 'var(--r-md)' }}>
                        <Icon name="lightbulb" size={16} style={{ color: '#0a7f7e', marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: '#0a6a69', lineHeight: 1.55 }}>{item.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {!isPro && lockedCount > 0 && (
              <div style={{ marginTop: 8 }}>
                <ToolPaywall count={lockedCount} label="question set" />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => setStage('input')}>
                <Icon name="refresh" size={16} /> New role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={null}>
      <InterviewPrepInner />
    </Suspense>
  )
}
