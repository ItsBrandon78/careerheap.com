'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/ui/Icon'

const CONSENT_KEY = 'careerheap_consent_v1'

let listeners: Array<() => void> = []

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(callback: () => void) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter((l) => l !== callback)
  }
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY)
  } catch {
    return 'essential' // storage blocked → treat as decided, never nag
  }
}

// Stable non-null value during SSR/first hydration render so the banner stays
// hidden until the client reads real localStorage (no hydration mismatch).
function getServerSnapshot(): string {
  return 'ssr'
}

function setConsent(value: 'essential' | 'all') {
  try {
    window.localStorage.setItem(CONSENT_KEY, value)
  } catch {
    /* storage unavailable */
  }
  emit()
}

/**
 * PIPEDA-style cookie/consent bar, ported from the prototype (enhancements.jsx
 * ConsentBanner). Essential-only vs Accept, persisted to localStorage so it
 * shows once. Hidden in print.
 */
export default function ConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (consent !== null) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="print-hidden fixed inset-x-4 bottom-4 z-[70] flex justify-center"
    >
      <div className="flex w-full max-w-[560px] flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
        <Icon name="shield" size={20} className="shrink-0 text-accent" />
        <p className="min-w-[220px] flex-1 text-[13px] leading-[1.55] text-text-secondary">
          We use essential cookies to keep you signed in and privacy-respecting analytics to improve
          CareerHeap. No ad trackers.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent('essential')}
            className="rounded-md px-4 py-2 text-[13.5px] font-semibold text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => setConsent('all')}
            className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white shadow-button hover:bg-accent-hover"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
