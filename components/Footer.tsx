'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import LanguageToggle from './LanguageToggle'
import { useT } from '@/lib/i18n/LocaleProvider'

const COLUMNS: { title: string; titleFr: string; links: [string, string, string][] }[] = [
  {
    title: 'Product',
    titleFr: 'Produit',
    links: [
      ['Career Planner', 'Planificateur de carrière', '/tools/career-switch-planner'],
      ['All tools', 'Tous les outils', '/tools'],
      ['Pricing', 'Tarifs', '/pricing']
    ]
  },
  {
    title: 'Company',
    titleFr: 'Entreprise',
    links: [
      ['About', 'À propos', '/about'],
      ['Blog', 'Blogue', '/blog'],
      ['Contact', 'Contact', '/contact']
    ]
  },
  {
    title: 'Legal',
    titleFr: 'Légal',
    links: [
      ['Privacy', 'Confidentialité', '/privacy'],
      ['Terms', 'Conditions', '/terms']
    ]
  }
]

export const Footer: React.FC = () => {
  const t = useT()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-bg-dark px-4 py-10 md:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-wide flex-col gap-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row">
          <div className="max-w-[280px] space-y-4">
            <BrandLogo variant="white" size="sm" />
            <p className="text-sm leading-[1.65] text-text-on-dark-muted">
              {t(
                "Canada-first career planning. Real roles, honest timelines, and a plan you'll actually follow — built for people starting with zero experience.",
                'La planification de carrière axée sur le Canada. Des rôles réels, des échéanciers honnêtes et un plan que vous suivrez vraiment — conçu pour ceux qui partent de zéro.'
              )}
            </p>
            <div className="flex gap-2">
              {[
                [t('Source-backed', 'Sourcé')],
                [t('No invented data', 'Aucune donnée inventée')]
              ].map(([tag]) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-pill bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-text-on-dark-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title} className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.6px] text-text-on-dark">
                  {t(col.title, col.titleFr)}
                </p>
                <div className="space-y-3">
                  {col.links.map(([label, labelFr, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="block text-sm text-text-on-dark-muted hover:text-text-on-dark"
                    >
                      {t(label, labelFr)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-text-on-dark-muted">
            &copy; {currentYear} CareerHeap. {t('All rights reserved.', 'Tous droits réservés.')}
          </p>
          <div className="flex items-center gap-4">
            <LanguageToggle tone="dark" />
            <p className="text-[12.5px] text-text-on-dark-muted">{t('Made in Canada', 'Fait au Canada')} 🍁</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
