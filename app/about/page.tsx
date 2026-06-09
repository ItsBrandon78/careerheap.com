import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'
import { getServerT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'About — CareerHeap',
  description:
    'CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About CareerHeap',
    description:
      'CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience.',
    type: 'website'
  }
}

const VALUES: { icon: string; t: string; tFr: string; d: string; dFr: string }[] = [
  {
    icon: 'shield',
    t: 'Honest by default',
    tFr: 'Honnête par défaut',
    d: 'Source-backed numbers, labeled estimates, and no invented facts — ever.',
    dFr: 'Des chiffres sourcés, des estimations étiquetées et aucun fait inventé — jamais.'
  },
  {
    icon: 'rocket',
    t: 'Action over diagnosis',
    tFr: "L'action plutôt que le diagnostic",
    d: "We don't just name the gap. We hand you the week-by-week bridge across it.",
    dFr: "Nous ne faisons pas que nommer l'écart. Nous vous donnons le pont, semaine par semaine, pour le franchir."
  },
  {
    icon: 'users',
    t: 'Built for beginners',
    tFr: 'Conçu pour les débutants',
    d: 'Zero experience is a starting line. The whole product is designed around that.',
    dFr: 'Zéro expérience est une ligne de départ. Tout le produit est conçu autour de cela.'
  }
]

const btnPrimaryLg =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-7 py-[15px] text-base font-semibold text-white shadow-button transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px'

export default async function AboutPage() {
  const { t } = await getServerT()

  return (
    <>
      <PageHero
        badge={t('Our mission', 'Notre mission')}
        title={t('Everyone deserves a path in', "Chacun mérite une voie d'entrée")}
        sub={t(
          'CareerHeap exists for the people the job market overlooks — students, switchers, and anyone starting with zero experience.',
          'CareerHeap existe pour les personnes que le marché du travail néglige — étudiants, personnes en transition et quiconque part sans expérience.'
        )}
      />

      <section className="mx-auto max-w-tool px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 24 }}>
        <div className="flex flex-col gap-[22px] text-[17px] leading-[1.75] text-text-secondary">
          <p>
            {t(
              'The career advice most people get is either vague ("network more!") or pessimistic ("you\'ll need years of experience first"). Neither helps you take the next step.',
              'La plupart des conseils de carrière sont soit vagues (« réseautez davantage! ») soit pessimistes (« il vous faudra d\'abord des années d\'expérience »). Ni l\'un ni l\'autre ne vous aide à passer à l\'étape suivante.'
            )}
          </p>
          <p className="text-[20px] font-semibold text-text-primary">
            {t(
              'We built CareerHeap on a simple belief: a clear, honest, source-backed plan beats a vague compatibility score every time.',
              'Nous avons bâti CareerHeap sur une conviction simple : un plan clair, honnête et sourcé vaut mieux qu\'un vague score de compatibilité, à tout coup.'
            )}
          </p>
          <p>
            {t(
              "Every roadmap is grounded in real occupation data, real wages, and real requirements — and every number shows where it came from. We never invent salaries or certifications, and we label what we don't know instead of guessing. When the news is hard, we tell you the bridge, not just the wall.",
              'Chaque feuille de route repose sur de vraies données de professions, de vrais salaires et de vraies exigences — et chaque chiffre indique sa provenance. Nous n\'inventons jamais de salaires ni de certifications, et nous étiquetons ce que nous ignorons au lieu de le deviner. Quand la nouvelle est difficile, nous vous montrons le pont, pas seulement le mur.'
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.t} className="rounded-lg border border-border-light bg-surface p-[26px] shadow-card">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-md bg-[#e3f7f6] text-[#0a7f7e]">
                <Icon name={value.icon} size={22} />
              </span>
              <h3 className="mt-[18px] text-[18px] font-bold">{t(value.t, value.tFr)}</h3>
              <p className="mt-2 text-[14px] leading-[1.65] text-text-secondary">{t(value.d, value.dFr)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 72 }}>
        <div className="relative overflow-hidden rounded-xl bg-bg-dark text-center" style={{ padding: '48px 40px' }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 80% -20%, rgba(36,93,255,0.4), transparent 50%), radial-gradient(circle at 0% 120%, rgba(14,165,164,0.25), transparent 45%)'
            }}
          />
          <div className="relative">
            <h2 className="text-[30px] font-extrabold text-white">{t('Start where you are.', 'Commencez là où vous êtes.')}</h2>
            <p className="mt-3 text-[16.5px] text-text-on-dark-muted">
              {t('Your first plan is free and takes four minutes.', 'Votre premier plan est gratuit et prend quatre minutes.')}
            </p>
            <Link href="/tools/career-switch-planner" className={`${btnPrimaryLg} mt-6`}>
              <Icon name="rocket" size={18} /> {t('Build my plan', 'Créer mon plan')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
