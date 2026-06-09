'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { Icon } from './ui/Icon'
import { useT } from '@/lib/i18n/LocaleProvider'

const PANEL_FEATURES: [string, string][] = [
  ['Save and resume your roadmap', 'Sauvegardez et reprenez votre feuille de route'],
  ['Track progress across phases', 'Suivez vos progrès à travers les phases'],
  ['Export to PDF or Notion', 'Exportez en PDF ou Notion']
]

/**
 * Split-screen auth layout ported from the prototype (Auth.jsx AuthShell):
 * form on the left, brand panel on the right. Pure presentational — the page
 * supplies the actual (Supabase-wired) form controls as children.
 */
export default function AuthShell({
  title,
  sub,
  children,
  footer
}: {
  title: string
  sub: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="grid min-h-[calc(100vh-140px)] lg:grid-cols-2">
      {/* left: form */}
      <div className="flex flex-col px-6 py-8 md:px-10">
        <Link href="/" aria-label="CareerHeap home" className="self-start">
          <BrandLogo size="sm" />
        </Link>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-bold">{title}</h1>
          <p className="mt-2 text-[15px] text-text-secondary">{sub}</p>
          <div className="mt-7">{children}</div>
        </div>
        <div className="text-center text-sm text-text-secondary">{footer}</div>
      </div>

      {/* right: brand panel */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-bg-dark px-14 py-12 lg:flex">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 80% 10%, rgba(36,93,255,0.45), transparent 50%), radial-gradient(circle at 10% 100%, rgba(14,165,164,0.32), transparent 48%)'
          }}
        />
        <div className="relative">
          <div className="mb-8 flex h-[90px] items-end gap-2">
            {[36, 54, 74, 96, 118].map((h, i) => (
              <div
                key={i}
                className="w-5 rounded-md"
                style={{
                  height: h,
                  background: i === 4 ? 'var(--color-accent-secondary)' : 'rgba(255,255,255,0.9)'
                }}
              />
            ))}
          </div>
          <h2 className="max-w-[380px] text-[30px] font-bold leading-[1.2] text-text-on-dark">
            {t('Your path in, saved and ready.', "Votre voie d'entrée, sauvegardée et prête.")}
          </h2>
          <p className="mt-4 max-w-[380px] text-base leading-[1.65] text-text-on-dark-muted">
            {t(
              "Pick up your roadmap on any device, track your progress, and export your plan whenever you're ready.",
              "Reprenez votre feuille de route sur n'importe quel appareil, suivez vos progrès et exportez votre plan quand vous êtes prêt."
            )}
          </p>
          <div className="mt-7 flex flex-col gap-3.5">
            {PANEL_FEATURES.map(([feature, featureFr]) => (
              <div key={feature} className="flex items-center gap-2.5 text-[15px] text-text-on-dark">
                <span className="text-[color:var(--color-accent-secondary)]">
                  <Icon name="checkCircle" size={19} />
                </span>
                {t(feature, featureFr)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
