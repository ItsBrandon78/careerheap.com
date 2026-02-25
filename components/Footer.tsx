import React from 'react'
import Link from 'next/link'
import { ToolGlyph } from './Icons'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-bg-dark px-4 py-12 md:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-wide flex-col gap-10">
        <div className="flex flex-col justify-between gap-10 lg:flex-row">
          <div className="max-w-[280px] space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-accent text-text-on-dark">
                <ToolGlyph kind="resume" className="h-3.5 w-3.5" />
              </span>
              <p className="text-base font-bold text-text-on-dark">CareerHeap</p>
            </div>
            <p className="text-sm leading-[1.6] text-text-on-dark-muted">
              Smarter career tools and insights to help you land your next role.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:gap-16">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-text-on-dark">Product</p>
              <Link href="/tools" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Tools</Link>
              <Link href="/pricing" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Pricing</Link>
              <Link href="/blog" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Blog</Link>
            </div>
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-text-on-dark">Company</p>
              <Link href="/about" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">About</Link>
              <Link href="/contact" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Contact</Link>
              <Link href="/careers" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Careers</Link>
            </div>
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-text-on-dark">Legal</p>
              <Link href="/privacy" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Privacy</Link>
              <Link href="/terms" className="block text-sm text-text-on-dark-muted hover:text-text-on-dark">Terms</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-bg-dark-surface pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-text-on-dark-muted">(c) {currentYear} CareerHeap. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-text-on-dark-muted">
            <span aria-hidden="true">X</span>
            <span aria-hidden="true">in</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
