import type { Metadata } from 'next'
import LegalDoc, { type LegalSection } from '@/components/LegalDoc'

export const metadata: Metadata = {
  title: 'Terms of Service — CareerHeap',
  description:
    'The terms that govern your use of CareerHeap. Use the Service responsibly; our guidance is informational and never a guarantee of a job.',
  alternates: { canonical: '/terms' }
}

const SECTIONS: LegalSection[] = [
  {
    h: 'Acceptance of these terms',
    p: [
      'By creating an account or using CareerHeap (the “Service”), you agree to these Terms of Service and to our Privacy Policy. If you don’t agree, please don’t use the Service.'
    ]
  },
  {
    h: 'What CareerHeap is',
    p: [
      'CareerHeap provides career-planning information: occupation matches, skill gaps, roadmaps, training options, and market data drawn from public and licensed datasets. It is a planning tool, not a recruiter, employer, school, or licensing body, and it does not guarantee employment, admission, certification, or a specific salary.'
    ]
  },
  {
    h: 'Your account',
    list: [
      'You must provide accurate information and be at least 16 years old.',
      'You are responsible for keeping your login credentials secure and for activity on your account.',
      'Notify us promptly of any unauthorized use.'
    ]
  },
  {
    h: 'Plans, billing, and cancellation',
    list: [
      'Free includes a limited preview at no cost. Pro and Annual are paid subscriptions billed in CAD through Stripe; Founders is a one-time payment.',
      'Paid subscriptions renew automatically until cancelled. You can cancel anytime from your account, and you’ll keep access through the end of the current billing period.',
      'Prices and plan features may change; we’ll give notice of material changes before they affect you.',
      'Except where required by law, payments are non-refundable for periods already started.'
    ]
  },
  {
    h: 'Acceptable use',
    p: [
      'You agree not to misuse the Service. That includes not attempting to scrape or resell our data, reverse-engineer the product, upload unlawful content, or use CareerHeap to harass others or violate anyone’s rights.'
    ]
  },
  {
    h: 'Your content and our content',
    p: [
      'You keep ownership of the inputs you provide (your profile, résumé text, and notes), and you grant us a limited licence to process them to deliver the Service. CareerHeap and its software, design, and original content remain our intellectual property. Plans you generate are yours to use for your own career planning.'
    ]
  },
  {
    h: 'Third-party data and links',
    p: [
      'Some information comes from third-party sources such as O*NET, Job Bank, ESDC, and Skilled Trades Ontario, and we may link to external programs or providers. We present this data in good faith and label estimates, but we don’t control third-party sites and aren’t responsible for their content or accuracy.'
    ]
  },
  {
    h: 'No professional advice or guaranteed outcomes',
    p: [
      'CareerHeap offers general information, not legal, financial, immigration, or career-counselling advice for your specific situation. Career outcomes depend on many factors outside our control, and we make no promise of any particular result.'
    ]
  },
  {
    h: 'Disclaimers and limitation of liability',
    p: [
      'The Service is provided “as is” without warranties of any kind. To the fullest extent permitted by law, CareerHeap is not liable for indirect or consequential damages, and our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.'
    ]
  },
  {
    h: 'Termination',
    p: [
      'You may stop using the Service and delete your account at any time. We may suspend or terminate access if these terms are breached or to protect the Service and its users.'
    ]
  },
  {
    h: 'Governing law',
    p: [
      'These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable there, without regard to conflict-of-laws rules.'
    ]
  },
  {
    h: 'Changes to these terms',
    p: [
      'We may update these terms from time to time. We’ll revise the date above and, for material changes, give reasonable notice. Continued use after changes take effect means you accept them.'
    ]
  }
]

export default function TermsPage() {
  return (
    <LegalDoc
      active="terms"
      badge="The fine print"
      title="Terms of Service"
      intro="These terms govern your use of CareerHeap. We’ve kept them as readable as we can. The short version: use the Service responsibly, our guidance is informational and never a guarantee of a job, and you can cancel a paid plan anytime."
      sections={SECTIONS}
    />
  )
}
