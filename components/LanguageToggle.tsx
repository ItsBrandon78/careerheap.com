'use client'

import { LOCALES } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/LocaleProvider'

/**
 * EN/FR pill toggle, ported from the prototype footer. `tone` matches the
 * surface it sits on (dark footer vs light surfaces).
 */
export default function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locale, setLocale } = useLocale()
  const trackBg = tone === 'dark' ? 'rgba(255,255,255,0.08)' : 'var(--bg-secondary)'
  const idleColor = tone === 'dark' ? 'var(--on-dark-muted)' : 'var(--text-secondary)'

  return (
    <div
      role="group"
      aria-label="Language"
      style={{ display: 'flex', alignItems: 'center', gap: 4, background: trackBg, borderRadius: 'var(--pill, 100px)', padding: 3 }}
    >
      {LOCALES.map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 11px',
              borderRadius: 'var(--pill, 100px)',
              fontSize: 12,
              fontWeight: 700,
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : idleColor
            }}
          >
            {code.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
