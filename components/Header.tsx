'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Button from './Button'
import Badge from './Badge'
import { useAuth } from '@/lib/auth/context'
import { ToolGlyph } from './Icons'

function initialsFromEmail(email?: string | null) {
  if (!email) return 'CH'
  const base = email.split('@')[0] ?? ''
  const [first, second] = base.split(/[.\-_ ]+/)
  const chars = `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase()
  return chars || base.slice(0, 2).toUpperCase()
}

function PlanBadge() {
  const { plan, usage } = useAuth()

  if (plan === 'pro') {
    return <Badge>Pro</Badge>
  }

  if (plan === 'lifetime') {
    return <Badge>Lifetime</Badge>
  }

  const used = usage?.used ?? 0
  const limit = usage?.limit ?? 3
  const remaining = usage?.usesRemaining ?? Math.max(limit - used, 0)
  return <Badge>{`Free • ${remaining}/${limit} uses left`}</Badge>
}

function UserMenuDropdown({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const menuId = 'account-menu'
  const initials = useMemo(() => initialsFromEmail(user?.email), [user?.email])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-border bg-bg-secondary text-sm font-semibold text-text-primary hover:border-accent"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Open account menu"
      >
        {initials}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-panel"
        >
          <div className="px-3 py-2 text-xs text-text-tertiary">{user?.email}</div>
          <Link href="/account" role="menuitem" className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary" onClick={() => setOpen(false)}>
            Account
          </Link>
          <Link href="/account?tab=billing" role="menuitem" className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary" onClick={() => setOpen(false)}>
            Billing
          </Link>
          <Link href="/account?tab=usage" role="menuitem" className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary" onClick={() => setOpen(false)}>
            Usage
          </Link>
          <Link href="/account?tab=security" role="menuitem" className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              await onSignOut()
            }}
            role="menuitem"
            className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isLoading, signOut } = useAuth()
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const focusableElements = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusableElements?.[0]
    const last = focusableElements?.[focusableElements.length - 1]
    first?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        mobileMenuButtonRef.current?.focus()
        return
      }

      if (event.key === 'Tab' && first && last) {
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
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <header className="w-full border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-wide items-center justify-between px-4 py-4 md:px-6 lg:px-10">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-text-on-dark">
              <ToolGlyph kind="resume" className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold text-text-primary">CareerHeap</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            <Link href="/tools" className="text-[15px] font-medium text-text-secondary hover:text-text-primary">
              Tools
            </Link>
            <Link href="/pricing" className="text-[15px] font-medium text-text-secondary hover:text-text-primary">
              Pricing
            </Link>
            <Link href="/blog" className="text-[15px] font-medium text-text-secondary hover:text-text-primary">
              Blog
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {!isLoading && user ? (
            <>
              <div className="hidden md:block">
                <PlanBadge />
              </div>
              <UserMenuDropdown onSignOut={signOut} />
            </>
          ) : !isLoading ? (
            <>
              <Link href="/login" className="hidden text-[15px] font-medium text-text-secondary md:block">
                Log In
              </Link>
              <Link href="/signup" className="hidden text-[15px] font-medium text-text-secondary md:block">
                Sign Up
              </Link>
              <Link href="/tools/career-switch-planner">
                <Button variant="primary" size="md">
                  Try Free
                </Button>
              </Link>
            </>
          ) : null}

          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setIsOpen((state) => !state)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-primary text-text-secondary md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <span className="space-y-1">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={mobileDrawerRef}
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="border-t border-border px-4 py-3 md:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto flex max-w-wide flex-col gap-2">
            <Link
              href="/tools"
              className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
              onClick={() => setIsOpen(false)}
            >
              Tools
            </Link>
            <Link
              href="/pricing"
              className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>

            {!isLoading && user && (
              <>
                <div className="my-2 border-t border-border" />
                <div className="px-3 py-1">
                  <PlanBadge />
                </div>
                <Link
                  href="/account"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="/account?tab=billing"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Billing
                </Link>
                <Link
                  href="/account?tab=usage"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Usage
                </Link>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={async () => {
                    await signOut()
                    setIsOpen(false)
                  }}
                >
                  Log out
                </button>
              </>
            )}

            {!isLoading && !user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
                <Link href="/tools/career-switch-planner" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Try Free
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
