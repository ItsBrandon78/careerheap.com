'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Button from '@/components/Button'
import {
  applyAccessibilityPreferences,
  defaultAccessibilityPreferences,
  getSystemAccessibilityDefaults,
  persistAccessibilityPreferences,
  readAccessibilityPreferences,
  type AccessibilityPreferences
} from '@/lib/accessibility/preferences'

function Fieldset({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (nextValue: string) => void
}) {
  const selectId = useId()

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-xs font-semibold text-text-secondary">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

type AccessibilityMenuProps = {
  placement?: 'inline' | 'floating'
}

export default function AccessibilityMenu({ placement = 'floating' }: AccessibilityMenuProps) {
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    if (typeof window === 'undefined') {
      return defaultAccessibilityPreferences
    }
    return readAccessibilityPreferences(window)
  })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    applyAccessibilityPreferences(document, preferences)
  }, [preferences])

  useEffect(() => {
    if (!open || !panelRef.current) return

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const closeMenu = () => {
      setOpen(false)
      triggerRef.current?.focus()
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
        return
      }

      if (event.key !== 'Tab' || !first || !last) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    const nextPreferences: AccessibilityPreferences = {
      ...preferences,
      [key]: value
    }
    setPreferences(nextPreferences)
    applyAccessibilityPreferences(document, nextPreferences)
    persistAccessibilityPreferences(window, nextPreferences)
  }

  const resetPreferences = () => {
    const defaults = getSystemAccessibilityDefaults(window)
    setPreferences(defaults)
    applyAccessibilityPreferences(document, defaults)
    persistAccessibilityPreferences(window, defaults)
  }

  return (
    <div
      className={placement === 'floating' ? 'fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6' : 'relative'}
      ref={rootRef}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant={placement === 'floating' ? 'outline' : 'ghost'}
        size="sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="a11y-preferences-panel"
        onClick={() => setOpen((state) => !state)}
        className={
          placement === 'floating'
            ? 'h-11 rounded-pill border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-panel hover:border-accent hover:text-accent'
            : 'text-xs md:text-sm'
        }
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-pill bg-accent-light text-[11px] font-bold text-accent"
        >
          Aa
        </span>
        Accessibility
      </Button>

      {open ? (
        <section
          ref={panelRef}
          id="a11y-preferences-panel"
          role="dialog"
          aria-label="Accessibility preferences"
          aria-modal="true"
          className={
            placement === 'floating'
              ? 'absolute bottom-full right-0 z-40 mb-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-4 shadow-panel'
              : 'absolute right-0 z-40 mt-2 w-[300px] rounded-lg border border-border bg-surface p-4 shadow-panel'
          }
        >
          <p className="text-sm font-semibold text-text-primary">Accessibility preferences</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Personalize visibility, motion, and focus behavior.
          </p>

          <div className="mt-3 space-y-3">
            <Fieldset
              label="Text size"
              value={preferences.textSize}
              onChange={(value) =>
                updatePreference('textSize', value as AccessibilityPreferences['textSize'])
              }
              options={[
                { value: 'default', label: 'Default' },
                { value: 'large', label: 'Large' }
              ]}
            />
            <Fieldset
              label="Contrast"
              value={preferences.contrast}
              onChange={(value) =>
                updatePreference('contrast', value as AccessibilityPreferences['contrast'])
              }
              options={[
                { value: 'default', label: 'Default' },
                { value: 'high', label: 'High contrast' }
              ]}
            />
            <Fieldset
              label="Motion"
              value={preferences.motion}
              onChange={(value) =>
                updatePreference('motion', value as AccessibilityPreferences['motion'])
              }
              options={[
                { value: 'default', label: 'Default' },
                { value: 'reduced', label: 'Reduced motion' }
              ]}
            />
            <Fieldset
              label="Focus ring"
              value={preferences.focus}
              onChange={(value) =>
                updatePreference('focus', value as AccessibilityPreferences['focus'])
              }
              options={[
                { value: 'default', label: 'Default' },
                { value: 'enhanced', label: 'Enhanced' }
              ]}
            />
            <Fieldset
              label="Links"
              value={preferences.links}
              onChange={(value) =>
                updatePreference('links', value as AccessibilityPreferences['links'])
              }
              options={[
                { value: 'default', label: 'Default' },
                { value: 'underlined', label: 'Always underlined' }
              ]}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={resetPreferences}>
              Reset to defaults
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
