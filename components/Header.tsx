'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Button from './Button'
import { useAuth } from '@/lib/auth/context'
import { ToolGlyph } from './Icons'

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isLoading, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

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

          <nav className="hidden items-center gap-7 md:flex">
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
              <Link href="/account" className="hidden text-[15px] font-medium text-text-secondary md:block">
                {user.email?.split('@')[0] || 'Account'}
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : !isLoading ? (
            <>
              <Link href="/login" className="hidden text-[15px] font-medium text-text-secondary md:block">
                Log In
              </Link>
              <Link href="/tools/resume-analyzer">
                <Button variant="primary" size="md">
                  Try Free
                </Button>
              </Link>
            </>
          ) : null}

          <button
            onClick={() => setIsOpen((state) => !state)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg-primary text-text-secondary md:hidden"
            aria-label="Toggle navigation menu"
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
        <nav className="border-t border-border px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-wide flex-col gap-2">
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

            {!isLoading && !user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-[15px] font-medium text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Log In
                </Link>
                <Link href="/tools/resume-analyzer" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Try Free
                  </Button>
                </Link>
              </>
            )}

            {!isLoading && user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link
                  href="/account"
                  className="rounded-md px-3 py-2 text-[15px] font-medium text-text-secondary hover:bg-bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  {user.email?.split('@')[0] || 'Account'}
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={async () => {
                    await handleSignOut()
                    setIsOpen(false)
                  }}
                >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

export default Header
