import type { Metadata } from 'next'
import LegalDoc, { type LegalSection } from '@/components/LegalDoc'
import { getServerT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Privacy Policy — CareerHeap',
  description:
    'How CareerHeap collects, uses, and protects your information. We don’t sell your data, and we don’t invent facts about you.',
  alternates: { canonical: '/privacy' }
}

const SECTIONS: LegalSection[] = [
  {
    h: 'Who we are',
    p: [
      'CareerHeap is a Canada-first career-planning service operated from Ontario, Canada. This policy applies to our website, the Career Switch Planner, and related tools (the “Service”).'
    ]
  },
  {
    h: 'Information we collect',
    list: [
      'Account details — your name and email when you create an account (authentication is handled by our infrastructure provider, Supabase).',
      'Planner inputs — the situation, skills, education, location, timeline, and goals you enter to generate a plan.',
      'Résumé text — if you choose to upload a résumé, we process its text to extract skills and experience. Raw résumé files are not stored as permanent profile data, and an optional mode lets you keep only the structured extraction.',
      'Usage data — pages visited and tools used, to improve the product (privacy-respecting analytics).',
      'Billing details — if you upgrade, payment is processed by Stripe. We never see or store full card numbers.'
    ]
  },
  {
    h: 'How we use your information',
    list: [
      'To generate your plan — matching your inputs against occupation and wage datasets to build roadmaps, skill gaps, and recommendations.',
      'To save and sync your plans across your devices.',
      'To improve matching — using only aggregated, de-identified signals (for example, which starter steps people complete first). We never replay one person’s plan into another’s.',
      'To process payments, provide support, and send essential service messages.'
    ]
  },
  {
    h: 'The datasets behind your plan',
    p: [
      'Your recommendations are built on public and licensed reference data, including O*NET (occupations and skills), Job Bank and ESDC (Canadian wages and employment outlook), and Skilled Trades Ontario (trade requirements). Where a number is an estimate rather than a sourced figure, we label it as such inside your plan.'
    ]
  },
  {
    h: 'How we share information',
    p: [
      'We do not sell your personal information. We share data only with service providers who help us run CareerHeap, under contract and only as needed:'
    ],
    list: [
      'Supabase — authentication and database hosting.',
      'Stripe — payment processing for paid plans.',
      'Privacy-respecting analytics — aggregate usage measurement.',
      'Legal — if required by law or to protect rights and safety.'
    ]
  },
  {
    h: 'Data retention and your controls',
    p: ['You stay in control of what we keep. From your account you can:'],
    list: [
      'Delete a saved plan at any time.',
      'Delete your résumé extraction data.',
      'Choose not to store your raw résumé file (structured extraction only).',
      'Export your plan, or request deletion of your entire account by emailing privacy@careerheap.ca.'
    ]
  },
  {
    h: 'Security',
    p: [
      'We use encryption in transit, access controls, and reputable infrastructure providers. No system is perfectly secure, but we work to protect your information and to limit what we collect in the first place.'
    ]
  },
  {
    h: 'Cookies and analytics',
    p: [
      'We use essential cookies to keep you signed in and a lightweight analytics layer to understand which features help people. We do not use advertising trackers.'
    ]
  },
  {
    h: 'Your rights under Canadian law',
    p: [
      'Under PIPEDA and applicable provincial laws, you have the right to access, correct, and delete your personal information, and to withdraw consent. If you are outside Canada, your data may be processed in Canada and other countries where our providers operate.'
    ]
  },
  {
    h: 'Children',
    p: [
      'CareerHeap is not directed at children under 16, and we do not knowingly collect their personal information.'
    ]
  },
  {
    h: 'Changes to this policy',
    p: [
      'If we make material changes, we’ll update the date above and, where appropriate, notify you in the product. Continued use after an update means you accept the revised policy.'
    ]
  }
]

export default async function PrivacyPage() {
  const { t } = await getServerT()
  return (
    <LegalDoc
      active="privacy"
      badge={t('Your privacy', 'Votre vie privée')}
      title={t('Privacy Policy', 'Politique de confidentialité')}
      intro={t(
        'CareerHeap helps you plan a career path, so you trust us with information about where you are and where you want to go. This policy explains what we collect, why, and the control you keep over it. In plain terms: we don’t sell your data, and we don’t invent facts about you.',
        'CareerHeap vous aide à planifier un parcours de carrière; vous nous confiez donc des renseignements sur votre situation et vos objectifs. Cette politique explique ce que nous recueillons, pourquoi, et le contrôle que vous conservez. En clair : nous ne vendons pas vos données et nous n’inventons pas de faits à votre sujet.'
      )}
      sections={SECTIONS}
    />
  )
}
