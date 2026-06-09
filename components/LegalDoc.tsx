import React from 'react'
import Link from 'next/link'
import { Icon } from './ui/Icon'
import { getServerT } from '@/lib/i18n/server'

export const LEGAL_UPDATED = 'June 7, 2026'

export type LegalSection = {
  h: string
  p?: string[]
  list?: string[]
}

const OTHERS: [string, string, string, string][] = [
  ['privacy', '/privacy', 'Privacy Policy', 'Politique de confidentialité'],
  ['terms', '/terms', 'Terms of Service', "Conditions d'utilisation"],
  ['contact', '/contact', 'Contact', 'Contact']
]

export default async function LegalDoc({
  active,
  badge,
  title,
  intro,
  sections
}: {
  active: 'privacy' | 'terms' | 'contact'
  badge: string
  title: string
  intro: string
  sections: LegalSection[]
}) {
  const { locale, t } = await getServerT()
  return (
    <>
      <section className="border-b border-border-light bg-bg-secondary px-4 pb-14 pt-16 text-center">
        <div className="mx-auto max-w-content">
          <span className="inline-flex items-center rounded-pill border border-accent/20 bg-accent-light px-3 py-1 text-[13px] font-semibold text-accent">
            {badge}
          </span>
          <h1 className="mt-[18px] font-bold" style={{ fontSize: 'clamp(30px,4.4vw,46px)' }}>
            {title}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 pb-20 pt-11">
        <div className="grid items-start gap-12 md:grid-cols-[220px_1fr]">
          <aside className="sticky top-[88px] hidden md:block">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.6px] text-text-tertiary">{t('Legal', 'Légal')}</p>
            <div className="flex flex-col gap-1">
              {OTHERS.map(([key, href, label, labelFr]) => (
                <Link
                  key={key}
                  href={href}
                  className={`rounded-md px-3 py-2.5 text-sm ${
                    key === active
                      ? 'bg-accent-light font-bold text-accent'
                      : 'font-medium text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {t(label, labelFr)}
                </Link>
              ))}
            </div>
            <div className="mt-5 rounded-md bg-bg-secondary px-3.5 py-3">
              <p className="text-xs text-text-tertiary">{t('Last updated', 'Dernière mise à jour')}</p>
              <p className="mt-0.5 text-[13.5px] font-semibold">{LEGAL_UPDATED}</p>
            </div>
          </aside>

          <div className="max-w-[720px]">
            {locale === 'fr' ? (
              <p className="mb-4 rounded-md border border-border-light bg-bg-secondary px-4 py-3 text-[13.5px] leading-[1.6] text-text-secondary">
                Ce document est fourni en anglais; la version anglaise fait foi.
              </p>
            ) : null}
            <p className="mb-2 text-[17px] leading-[1.75] text-text-secondary">{intro}</p>
            <div className="mt-7 flex flex-col gap-[30px]">
              {sections.map((s, i) => (
                <div key={s.h}>
                  <h2 className="mb-3 text-xl font-bold">
                    <span className="font-bold text-accent">{String(i + 1).padStart(2, '0')}.</span>{' '}
                    {s.h}
                  </h2>
                  {s.p?.map((para, j) => (
                    <p key={j} className="mb-3 text-[15.5px] leading-[1.75] text-text-secondary">
                      {para}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="mt-1.5 flex flex-col gap-2.5">
                      {s.list.map((li, j) => (
                        <li key={j} className="flex gap-2.5 text-[15.5px] leading-[1.65] text-text-secondary">
                          <span className="mt-0.5 shrink-0 text-accent">
                            <Icon name="check" size={16} stroke={2.5} />
                          </span>
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-lg border border-border-light bg-bg-primary px-[22px] py-5">
              <p className="text-[14.5px] leading-[1.65] text-text-secondary">
                {t(
                  `Questions about this ${active === 'privacy' ? 'policy' : active === 'terms' ? 'agreement' : 'page'}?`,
                  `Des questions sur ${active === 'privacy' ? 'cette politique' : active === 'terms' ? 'cet accord' : 'cette page'}?`
                )}{' '}
                {t('Reach us at', 'Joignez-nous via')}{' '}
                <Link href="/contact" className="font-bold text-accent">
                  {t('our contact page', 'notre page de contact')}
                </Link>{' '}
                {t('or email', 'ou par courriel à')} <span className="font-semibold text-accent">privacy@careerheap.ca</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
