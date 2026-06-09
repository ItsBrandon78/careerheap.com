import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'
import { getServerT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Career Tools — CareerHeap',
  description:
    'Start with the planner to find your path, then sharpen your résumé, interviews, and applications.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'The CareerHeap toolkit',
    description:
      'Résumé analyzer, interview prep, cover letter writer, and the career switch planner — built for Canadian job seekers.',
    type: 'website'
  }
}

type Tool = {
  slug: string
  title: string
  titleFr: string
  desc: string
  descFr: string
  icon: string
  active: boolean
  href?: string
}

const TOOLS: Tool[] = [
  {
    slug: 'resume-analyzer',
    title: 'Résumé Analyzer',
    titleFr: 'Analyseur de CV',
    desc: 'Tighten your résumé for real employer filters and Canadian job expectations.',
    descFr: "Optimisez votre CV pour les vrais filtres d'employeurs et les attentes du marché canadien.",
    icon: 'award',
    active: true,
    href: '/tools/resume-analyzer'
  },
  {
    slug: 'resume-builder',
    title: 'Résumé Builder',
    titleFr: 'Créateur de CV',
    desc: 'Build and edit a clean, recruiter-ready résumé with a live preview and PDF export.',
    descFr: 'Créez et modifiez un CV soigné, prêt pour les recruteurs, avec aperçu en direct et exportation PDF.',
    icon: 'book',
    active: true,
    href: '/tools/resume-builder'
  },
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    titleFr: 'Préparation aux entrevues',
    desc: 'Practice stronger answers based on the role, the posting, and what employers actually ask.',
    descFr: "Pratiquez de meilleures réponses selon le rôle, l'offre et ce que les employeurs demandent vraiment.",
    icon: 'message',
    active: true,
    href: '/tools/interview-prep'
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    titleFr: 'Rédacteur de lettre de présentation',
    desc: 'Create a focused cover letter using the job posting and your real background.',
    descFr: "Créez une lettre de présentation ciblée à partir de l'offre d'emploi et de votre parcours réel.",
    icon: 'book',
    active: true,
    href: '/tools/cover-letter'
  },
  {
    slug: 'job-match-score',
    title: 'Job Match Score',
    titleFr: "Score de compatibilité d'emploi",
    desc: 'See how well your profile matches a posting and exactly what to improve.',
    descFr: 'Voyez à quel point votre profil correspond à une offre et exactement quoi améliorer.',
    icon: 'target',
    active: false
  }
]

export default async function ToolsPage() {
  const { t } = await getServerT()
  return (
    <>
      <PageHero
        badge={t('The CareerHeap toolkit', 'La boîte à outils CareerHeap')}
        title={t('Tools for every step of the search', 'Des outils pour chaque étape de la recherche')}
        sub={t(
          'Start with the planner to find your path, then sharpen your résumé, interviews, and applications.',
          'Commencez par le planificateur pour trouver votre voie, puis peaufinez votre CV, vos entrevues et vos candidatures.'
        )}
      />

      <section className="mx-auto max-w-content px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 72 }}>
        {/* featured */}
        <Link
          href="/tools/career-switch-planner"
          className="grid overflow-hidden rounded-lg border-[1.5px] border-accent bg-surface md:grid-cols-[1.1fr_1fr]"
        >
          <div className="p-9">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
              <Icon name="sparkle" size={12} fill /> {t('Start here', 'Commencez ici')}
            </span>
            <h2 className="mt-4 text-[26px] font-extrabold">{t('Career Switch Planner', 'Planificateur de réorientation')}</h2>
            <p className="mt-2.5 max-w-[420px] text-[15.5px] leading-[1.65] text-text-secondary">
              {t(
                'See the Canadian pathway, timeline, requirements, and exact next steps for any first role.',
                "Voyez le parcours canadien, l'échéancier, les exigences et les prochaines étapes précises pour tout premier rôle."
              )}
            </p>
            <span className="mt-[22px] inline-flex items-center gap-2 rounded-lg bg-accent px-[22px] py-[13px] text-[15px] font-semibold text-white shadow-button">
              <Icon name="rocket" size={17} /> {t('Build my plan', 'Créer mon plan')}
            </span>
          </div>
          <div className="relative grid min-h-[220px] place-items-center overflow-hidden bg-bg-dark">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 70% 20%, rgba(36,93,255,0.5), transparent 55%), radial-gradient(circle at 10% 100%, rgba(14,165,164,0.35), transparent 50%)'
              }}
            />
            <div className="relative flex items-end gap-2" style={{ height: 110 }}>
              {[40, 60, 82, 104, 128].map((h, i) => (
                <div
                  key={i}
                  className="w-[22px] rounded-md"
                  style={{ height: h, background: i === 4 ? 'var(--color-accent-secondary)' : 'rgba(255,255,255,0.85)' }}
                />
              ))}
            </div>
          </div>
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOLS.map((tool) => (
            <div
              key={tool.slug}
              className="flex items-start gap-4 rounded-lg border border-border-light bg-surface p-6 shadow-card"
              style={{ opacity: tool.active ? 1 : 0.72 }}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${
                  tool.active ? 'bg-accent-light text-accent' : 'bg-bg-secondary text-text-tertiary'
                }`}
              >
                <Icon name={tool.icon} size={23} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold">{t(tool.title, tool.titleFr)}</h3>
                  {!tool.active && (
                    <span className="rounded-pill bg-bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-text-secondary">
                      {t('Coming soon', 'Bientôt disponible')}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-text-secondary">{t(tool.desc, tool.descFr)}</p>
                {tool.active && tool.href && (
                  <Link
                    href={tool.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent"
                  >
                    {t('Open tool', "Ouvrir l'outil")} <Icon name="arrow" size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
