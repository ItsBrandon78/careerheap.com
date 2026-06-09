'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/lib/auth/context'
import { getSupabaseAuthHeaders } from '@/lib/supabase/authHeaders'

/* Shared prototype-styled primitives + run hook for the companion tools
   (Résumé Analyzer, Interview Prep, Cover Letter). Ported from the prototype
   app/ToolsApps.jsx, wired to /api/tools/generate. */

export function ToolTopBar() {
  const router = useRouter()
  return (
    <div className="print-hidden" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)' }}>
      <div className="wrap" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => router.push('/tools')}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <Icon name="arrowLeft" size={16} /> All tools
        </button>
        <Link href="/pricing" className="btn btn-dark btn-sm">
          <Icon name="sparkle" size={14} fill /> Upgrade
        </Link>
      </div>
    </div>
  )
}

export function FreeMeter({ usesRemaining }: { usesRemaining: number | null }) {
  const left = usesRemaining ?? 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--warning-light)',
        borderRadius: 'var(--r-md)',
        border: '1px solid #f3e2bf',
        flexWrap: 'wrap'
      }}
    >
      <Icon name="zap" size={17} style={{ color: 'var(--warning)' }} />
      <p style={{ fontSize: 13.5, color: '#8a5a09', flex: 1, minWidth: 180 }}>
        <strong>{left} free {left === 1 ? 'run' : 'runs'} left.</strong> You’re seeing a preview — upgrade for full
        results and unlimited runs.
      </p>
      <Link href="/pricing" className="btn btn-dark btn-sm">
        <Icon name="sparkle" size={14} fill /> Go Pro
      </Link>
    </div>
  )
}

export function LockedItem({ title }: { title: string }) {
  return (
    <div style={{ position: 'relative', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)', padding: '16px 18px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-light)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="lock" size={14} />
        </span>
        <p style={{ fontSize: 14.5, fontWeight: 600, flex: 1 }}>{title}</p>
        <Link href="/pricing" className="btn btn-outline btn-sm">
          Unlock
        </Link>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, filter: 'blur(3px)', userSelect: 'none' }}>
        This insight is part of your full analysis — upgrade to Pro to see exactly what to change and why it matters for
        your target role.
      </p>
    </div>
  )
}

export function ToolPaywall({ count, label }: { count: number; label: string }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: 'var(--bg-dark)', padding: 'clamp(24px,4vw,32px)', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 0%, rgba(36,93,255,0.4), transparent 55%)' }} />
      <div style={{ position: 'relative' }}>
        <span className="badge">
          <Icon name="lock" size={12} /> {count} more locked
        </span>
        <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginTop: 14 }}>Unlock the full {label}</h3>
        <p style={{ color: 'var(--on-dark-muted)', fontSize: 15, marginTop: 8, maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>
          Pro gives you every finding, the exact rewrites, and unlimited runs across all CareerHeap tools.
        </p>
        <Link href="/pricing" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>
          <Icon name="sparkle" size={18} fill /> Upgrade to Pro — $15 CAD/mo
        </Link>
        <p style={{ fontSize: 12.5, color: 'var(--on-dark-muted)', marginTop: 12 }}>Cancel anytime · 7-day money-back guarantee</p>
      </div>
    </div>
  )
}

export function ScoreRing({ value, max = 100, size = 96, color = 'var(--accent)' }: { value: number; max?: number; size?: number; color?: string }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-light)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / max)}
          style={{ transition: 'stroke-dashoffset 1s var(--ease)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 2 }}>/ {max}</span>
      </div>
    </div>
  )
}

export function GeneratingCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="card anim-up" style={{ marginTop: 28, padding: 48, textAlign: 'center' }}>
      <span
        style={{
          width: 46,
          height: 46,
          border: '3px solid var(--accent)',
          borderRightColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin .7s linear infinite'
        }}
      />
      <p style={{ fontSize: 16, fontWeight: 700, marginTop: 18 }}>{title}</p>
      <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginTop: 6 }}>{detail}</p>
    </div>
  )
}

export function ToolHero({ icon, badge, title, sub }: { icon: string; badge: string; title: string; sub: string }) {
  return (
    <div>
      <span className="badge badge-teal">
        <Icon name={icon} size={13} /> {badge}
      </span>
      <h1 style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800, marginTop: 14 }}>{title}</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6, maxWidth: 600 }}>{sub}</p>
    </div>
  )
}

export type RunStage = 'input' | 'loading' | 'result'

export function useToolRun<T>(tool: string) {
  const { plan, user } = useAuth()
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<RunStage>('input')
  const [result, setResult] = useState<T | null>(null)
  const [isPro, setIsPro] = useState(plan === 'pro' || plan === 'lifetime')
  const [usesRemaining, setUsesRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)

  const run = async (body: Record<string, unknown>) => {
    setError('')
    setLocked(false)
    setStage('loading')
    try {
      const qa = new URLSearchParams()
      const planParam = searchParams.get('plan')
      const usesParam = searchParams.get('uses')
      if (planParam) qa.set('plan', planParam)
      if (usesParam) qa.set('uses', usesParam)
      const authHeaders = await getSupabaseAuthHeaders()
      const response = await fetch(`/api/tools/generate${qa.toString() ? `?${qa.toString()}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ tool, ...body })
      })
      const data = (await response.json().catch(() => null)) as
        | { result?: T; isPro?: boolean; usage?: { usesRemaining?: number | null }; error?: string }
        | null

      if (response.status === 401) {
        setError('Sign in to run this tool and save your usage.')
        setStage('input')
        return
      }
      if (response.status === 402) {
        setLocked(true)
        setError('You’ve used your free runs. Upgrade to Pro for unlimited access.')
        setStage('input')
        return
      }
      if (!response.ok || !data?.result) {
        setError(data?.error || 'Something went wrong. Please try again.')
        setStage('input')
        return
      }
      setResult(data.result)
      setIsPro(Boolean(data.isPro))
      setUsesRemaining(data.usage?.usesRemaining ?? null)
      setStage('result')
    } catch {
      setError('Network error. Please try again.')
      setStage('input')
    }
  }

  return { stage, setStage, result, isPro, usesRemaining, error, locked, run, signedIn: Boolean(user) }
}
