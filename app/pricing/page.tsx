import PricingCard from '@/components/PricingCard';
import FAQAccordion from '@/components/FAQAccordion';
import CTASection from '@/components/CTASection';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: 9,
    period: 'month' as const,
    description: 'Perfect for getting started',
    features: [
      'Unlimited tool uses',
      'Basic AI analysis',
      'Email support',
      '30-day history',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 19,
    period: 'month' as const,
    description: 'For serious career growth',
    features: [
      'Everything in Starter',
      'Advanced AI analysis',
      'Priority support',
      '1-year history',
      'Export to PDF',
      'Interview templates',
    ],
    highlighted: true,
  },
  {
    name: 'Annual',
    price: 180,
    period: 'year' as const,
    description: 'Best value (2 months free)',
    features: [
      'Everything in Professional',
      'Save 40% vs monthly',
      'Lifetime history',
      '24/7 phone support',
      'Custom templates',
      'Early access to new tools',
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. No hidden fees or long-term contracts.',
  },
  {
    question: 'Do you offer a refund?',
    answer: 'We offer a 30-day money-back guarantee if you&apos;re not satisfied with the service.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and Apple Pay through our secure Stripe payment processing.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! You get 3 free uses on each tool to try them out before upgrading.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Of course! You can change your plan at any time. We&apos;ll prorate the price based on your billing cycle.',
  },
  {
    question: 'Do you offer team discounts?',
    answer: 'For team inquiries, please contact our sales team at sales@careerheap.com.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-linear-to-r from-sky-50 to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <div key={index}>
                <Link href="/checkout" className="block h-full">
                  <PricingCard
                    name={plan.name}
                    price={plan.price}
                    period={plan.period}
                    description={plan.description}
                    features={plan.features}
                    highlighted={plan.highlighted}
                    buttonText="Get Started"
                  />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-gray-600">
              Got questions? We&apos;ve got answers.
            </p>
          </div>

          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* CTA Section */}
      <CTASection
        title="Ready to Upgrade?"
        subtitle="Choose a plan that works for you and start getting AI-powered feedback today."
        primaryButtonText="Get Started Now"
      />
    </>
  );
}

