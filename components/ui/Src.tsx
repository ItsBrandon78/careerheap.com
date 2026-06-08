'use client'

import React, { useState } from 'react'
import { Icon } from './Icon'

/** Source provenance pill, ported from the prototype (data.jsx Src). */
export function Src({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">
      <Icon name="shield" size={11} />
      {children}
    </span>
  )
}

/** "Why this?" disclosure, ported from the prototype (data.jsx WhyThis). */
export function WhyThis({
  label = 'Why this?',
  children
}: {
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 py-1 text-[13.5px] font-semibold text-accent"
      >
        <Icon name="lightbulb" size={14} />
        {label}
        <Icon
          name="chevron"
          size={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open && (
        <div className="anim-in mt-2.5 rounded-md border border-border-light bg-[color:var(--color-accent)]/[0.04] px-4 py-3.5 text-[13.5px] leading-[1.65] text-text-secondary">
          {children}
        </div>
      )}
    </div>
  )
}
