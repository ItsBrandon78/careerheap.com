import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import FAQAccordion from '@/components/FAQAccordion'
import { Icon } from '@/components/ui/Icon'
import { getServerT } from '@/lib/i18n/server'
import type { Translator } from '@/lib/i18n/config'

export const metadata: Metadata = {
  title: 'Pricing — CareerHeap',
  description:
    'Start free. Upgrade to Pro for unlimited province-aware roadmaps, résumé upload, and exportable plans. CAD pricing.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Simple, transparent pricing — CareerHeap',
    description:
      'Start free. Upgrade when you want full province-aware guidance, résumé upload, and exportable roadmaps.',
    type: 'website'
  }
}

// NOTE: prototype pricing chosen as canonical (Pro $15/mo, Annual $129/yr, Founders $99 one-time).
// Stripe products/price IDs must be created to match these amounts before checkout charges correctly.
type Plan = {
  name: string
  nameFr: string
  price: string
  unit?: string
  unitFr?: string
  sub: string
  subFr: string
  cta: string
  ctaFr: string
  href: string
  highlighted?: boolean
  badge?: string
  badgeFr?: string
  features: [string, string][]
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    nameFr: 'Gratuit',
    price: '$0',
    sub: 'Canada-first preview',
    subFr: 'Aperçu axé Canada',
    cta: 'Start free',
    ctaFr: 'Commencer',
    href: '/tools/career-switch-planner',
    features: [
      ['Roadmap preview', 'Aperçu de la feuille de route'],
      ['Manual paste input', 'Saisie manuelle par collage'],
      ['Core pathway summary', 'Résumé du parcours principal'],
      ['3 lifetime analyses', '3 analyses à vie']
    ]
  },
  {
    name: 'Pro',
    nameFr: 'Pro',
    price: '$15',
    unit: 'CAD / month',
    unitFr: 'CAD / mois',
    sub: 'For a serious job search',
    subFr: "Pour une recherche d'emploi sérieuse",
    cta: 'Upgrade to Pro',
    ctaFr: 'Passer à Pro',
    href: '/checkout?plan=pro&cadence=monthly',
    highlighted: true,
    badge: 'Most popular',
    badgeFr: 'Le plus populaire',
    features: [
      ['Unlimited roadmaps', 'Feuilles de route illimitées'],
      ['Province-specific requirements', 'Exigences propres à la province'],
      ['Full step breakdown', 'Détail complet des étapes'],
      ['Résumé upload & parsing', 'Téléversement et analyse de CV'],
      ['PDF & Notion export', 'Exportation PDF et Notion']
    ]
  },
  {
    name: 'Annual',
    nameFr: 'Annuel',
    price: '$129',
    unit: 'CAD / year',
    unitFr: 'CAD / an',
    sub: 'Pro, at a lower yearly price',
    subFr: 'Pro, à un prix annuel réduit',
    cta: 'Choose Annual',
    ctaFr: "Choisir l'annuel",
    href: '/checkout?plan=pro&cadence=yearly',
    features: [
      ['Everything in Pro', 'Tout ce qui est dans Pro'],
      ['Save ~28% vs monthly', 'Économisez ~28 % vs mensuel'],
      ['Province-aware planning all year', "Planification adaptée à la province toute l'année"]
    ]
  }
]

const FAQS: { question: string; questionFr: string; answer: string; answerFr: string }[] = [
  {
    question: 'Can I try before I buy?',
    questionFr: "Puis-je essayer avant d'acheter?",
    answer:
      'Yes. Free lets you preview a real pathway and see the core roadmap structure before upgrading — no credit card required.',
    answerFr:
      'Oui. La version gratuite vous permet de prévisualiser un vrai parcours et de voir la structure de base de la feuille de route avant de passer à la version supérieure — aucune carte de crédit requise.'
  },
  {
    question: 'What unlocks with Pro?',
    questionFr: "Qu'est-ce que Pro débloque?",
    answer:
      'Pro unlocks unlimited roadmaps, province-specific requirements, deeper step breakdowns, résumé upload, and PDF export.',
    answerFr:
      "Pro débloque des feuilles de route illimitées, des exigences propres à la province, des détails d'étapes approfondis, le téléversement de CV et l'exportation PDF."
  },
  {
    question: 'How is Annual different?',
    questionFr: "En quoi l'annuel est-il différent?",
    answer: 'Annual includes everything in Pro at a lower yearly price than paying month to month.',
    answerFr: "L'annuel comprend tout ce qui est dans Pro à un prix annuel inférieur au paiement mensuel."
  },
  {
    question: 'What is Founders access?',
    questionFr: "Qu'est-ce que l'accès Fondateurs?",
    answer: 'A limited one-time offer that unlocks the full product with no recurring billing.',
    answerFr: 'Une offre unique limitée qui débloque le produit complet sans facturation récurrente.'
  },
  {
    question: 'What payment methods do you accept?',
    questionFr: 'Quels modes de paiement acceptez-vous?',
    answer:
      'Major credit cards through secure checkout. You can manage or cancel billing anytime from your account.',
    answerFr:
      'Les principales cartes de crédit via un paiement sécurisé. Vous pouvez gérer ou annuler la facturation à tout moment depuis votre compte.'
  }
]

const WHY: [string, string, string, string][] = [
  [
    'Province-specific truth',
    'La vérité propre à votre province',
    'Requirements and regulator context for your actual province.',
    'Exigences et contexte réglementaire pour votre province réelle.'
  ],
  [
    'Full roadmap depth',
    'Profondeur complète de la feuille de route',
    'Every phase, effort estimate, and proof-of-work artifact.',
    "Chaque phase, estimation d'effort et preuve de travail."
  ],
  [
    'Exportable plans',
    'Plans exportables',
    'Take your roadmap to PDF or Notion and share it.',
    'Emportez votre feuille de route en PDF ou Notion et partagez-la.'
  ]
]

const btn = 'inline-flex w-full items-center justify-center gap-2 rounded-lg px-[22px] py-[13px] text-[15px] font-semibold transition-all duration-150'

export default async function PricingPage() {
  const { t }: { t: Translator } = await getServerT()
  return (
    <>
      <PageHero
        badge={t('Pricing in CAD', 'Tarifs en CAD')}
        title={t('Simple, transparent pricing', 'Une tarification simple et transparente')}
        sub={t(
          'Start free. Upgrade when you want full province-aware guidance, résumé upload, and exportable roadmaps.',
          'Commencez gratuitement. Passez à la version supérieure pour un accompagnement complet adapté à votre province, le téléversement de CV et des feuilles de route exportables.'
        )}
      />

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 24 }}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="relative flex flex-col rounded-lg bg-surface p-7"
              style={{
                border: p.highlighted ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-light)',
                boxShadow: p.highlighted ? '0 16px 40px rgba(36,93,255,0.16)' : 'var(--sh-card, 0 6px 20px rgba(12,20,37,0.06))'
              }}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
                  <Icon name="star" size={12} fill /> {t(p.badge, p.badgeFr ?? p.badge)}
                </span>
              )}
              <p className="text-[15px] font-bold">{t(p.name, p.nameFr)}</p>
              <p className="mt-1 text-[13.5px] text-text-tertiary">{t(p.sub, p.subFr)}</p>
              <div className="mt-[18px] flex items-baseline gap-2">
                <span className="text-[40px] font-extrabold tracking-[-0.03em]">{p.price}</span>
                {p.unit && <span className="text-[14px] font-medium text-text-tertiary">{t(p.unit, p.unitFr ?? p.unit)}</span>}
              </div>
              <Link href={p.href} className={`${btn} mt-[22px] ${p.highlighted ? 'bg-accent text-white shadow-button hover:bg-accent-hover' : 'border border-border bg-surface text-text-secondary hover:border-accent hover:bg-accent-light hover:text-accent'}`}>
                {t(p.cta, p.ctaFr)}
              </Link>
              <div className="my-6 h-px bg-border-light" />
              <ul className="flex flex-col gap-3.5">
                {p.features.map(([f, fFr]) => (
                  <li key={f} className="flex gap-2.5 text-[14px] leading-[1.5] text-text-secondary">
                    <span className="shrink-0 text-success">
                      <Icon name="checkCircle" size={17} />
                    </span>
                    {t(f, fFr)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Founders banner */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-border-light bg-bg-secondary p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-warning-light px-[11px] py-[5px] text-[12px] font-semibold text-warning">
              <Icon name="zap" size={12} /> {t('Limited', 'Limité')}
            </span>
            <h3 className="mt-2.5 text-[19px] font-extrabold">{t('Founders — $99 CAD', 'Fondateurs — 99 $ CAD')}</h3>
            <p className="mt-1.5 max-w-[460px] text-[14px] text-text-secondary">
              {t(
                'Everything in Pro with no recurring billing. Lock in lifetime access.',
                'Tout ce qui est dans Pro, sans facturation récurrente. Verrouillez un accès à vie.'
              )}
            </p>
          </div>
          <Link href="/checkout?plan=lifetime" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-[22px] py-[13px] text-[15px] font-semibold text-white transition-all duration-150 hover:bg-bg-dark-surface">
            {t('Get Founders access', "Obtenir l'accès Fondateurs")}
          </Link>
        </div>

        <div className="mt-10">
          <p className="text-[14px] font-bold text-text-secondary">
            {t('Why Canadians upgrade', 'Pourquoi les Canadiens passent à la version supérieure')}
          </p>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {WHY.map(([title, titleFr, desc, descFr]) => (
              <div key={title} className="rounded-lg border border-border-light bg-surface p-[18px]">
                <p className="text-[14.5px] font-bold">{t(title, titleFr)}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-text-secondary">{t(desc, descFr)}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-7 text-center text-[13px] text-text-tertiary">
          {t(
            'CAD pricing · Secure checkout · Manage billing anytime',
            'Tarifs en CAD · Paiement sécurisé · Gérez la facturation à tout moment'
          )}
        </p>
      </section>

      <section className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 72 }}>
        <h2 className="text-center text-[26px] font-extrabold">{t('Questions, answered', 'Vos questions, nos réponses')}</h2>
        <p className="mb-7 mt-2 text-center text-[15px] text-text-secondary">
          {t(
            'Clear plans, predictable billing, same workflow whether you stay free or upgrade.',
            'Des forfaits clairs, une facturation prévisible, le même flux que vous restiez gratuit ou non.'
          )}
        </p>
        <FAQAccordion items={FAQS.map((f) => ({ question: t(f.question, f.questionFr), answer: t(f.answer, f.answerFr) }))} compact />
      </section>
    </>
  )
}
