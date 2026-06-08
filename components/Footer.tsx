import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Product',
    links: [
      ['Career Planner', '/tools/career-switch-planner'],
      ['All tools', '/tools'],
      ['Pricing', '/pricing']
    ]
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Blog', '/blog'],
      ['Contact', '/contact']
    ]
  },
  {
    title: 'Legal',
    links: [
      ['Privacy', '/privacy'],
      ['Terms', '/terms']
    ]
  }
]

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-bg-dark px-4 py-10 md:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-wide flex-col gap-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row">
          <div className="max-w-[280px] space-y-4">
            <BrandLogo variant="white" size="sm" />
            <p className="text-sm leading-[1.65] text-text-on-dark-muted">
              Canada-first career planning. Real roles, honest timelines, and a plan you&apos;ll
              actually follow — built for people starting with zero experience.
            </p>
            <div className="flex gap-2">
              {['Source-backed', 'No invented data'].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-pill bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-text-on-dark-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title} className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.6px] text-text-on-dark">
                  {col.title}
                </p>
                <div className="space-y-3">
                  {col.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="block text-sm text-text-on-dark-muted hover:text-text-on-dark"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-text-on-dark-muted">
            &copy; {currentYear} CareerHeap. All rights reserved.
          </p>
          <p className="text-[12.5px] text-text-on-dark-muted">Made in Canada 🍁</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
