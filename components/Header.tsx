'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Button from './Button'
import Badge from './Badge'
import { useAuth } from '@/lib/auth/context'
import BrandLogo from './BrandLogo'
import { Icon } from './ui/Icon'

const NAV: { label: string; href: string }[] = [
  { label: 'Tools', href: '/tools' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' }
]

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

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
  return <Badge>{`Free - ${remaining}/${limit} uses left`}</Badge>
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
  const pathname = usePathname()
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
    <header className="sticky top-0 z-40 border-b border-border-light bg-bg-primary/[0.82] backdrop-blur-[12px] backdrop-saturate-[180%]">
      <div className="mx-auto flex h-[68px] w-full max-w-content items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="CareerHeap home">
          <BrandLogo size="sm" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`text-[14.5px] ${
                  active ? 'font-bold text-accent' : 'font-medium text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {!isLoading && user ? (
            <>
              <div className="hidden md:block">
                <PlanBadge />
              </div>
              <UserMenuDropdown onSignOut={signOut} />
            </>
          ) : !isLoading ? (
            <>
              <Link
                href="/login"
                className="hidden text-[14.5px] font-semibold text-text-secondary hover:text-text-primary md:block"
              >
                Log in
              </Link>
              <Link href="/tools/career-switch-planner" className="hidden md:block">
                <Button variant="primary" size="sm">
                  <Icon name="arrow" size={16} /> Start free
                </Button>
              </Link>
            </>
          ) : null}

          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setIsOpen((state) => !state)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text-secondary md:hidden"
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
          className="border-t border-border-light bg-bg-primary px-4 py-3 md:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto flex max-w-content flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-[15px] ${
                  isActive(pathname, item.href)
                    ? 'bg-accent-light font-semibold text-accent'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {!isLoading && user && (
              <>
                <div className="my-2 border-t border-border-light" />
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
                <div className="my-2 border-t border-border-light" />
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-[15px] text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Log in
                </Link>
                <Link href="/tools/career-switch-planner" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    <Icon name="arrow" size={16} /> Start free
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
