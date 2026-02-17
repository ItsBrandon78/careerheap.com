import Badge from '@/components/Badge'
import BlogCard from '@/components/BlogCard'
import Button from '@/components/Button'
import FAQAccordion from '@/components/FAQAccordion'
import PaywallBanner from '@/components/PaywallBanner'
import PricingCard from '@/components/PricingCard'
import ToolCard from '@/components/ToolCard'
import ToolHero from '@/components/ToolHero'
import ToolUIContainer from '@/components/ToolUIContainer'
import { pricingFaqs } from '@/src/design/mockupData'

export default function DesignSystemPage() {
  return (
    <div className="bg-bg-primary px-4 py-10 lg:px-10">
      <div className="mx-auto flex max-w-wide flex-col gap-12">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold text-text-primary">Design System Components</h1>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <ToolCard
            slug="resume-analyzer"
            title="Resume Analyzer"
            description="Get instant AI feedback on your resume."
            icon="resume"
          />
          <BlogCard
            slug="resume-mistakes-cost-interviews"
            category="Career Tips"
            title="10 Resume Mistakes That Cost You Interviews"
            date="Feb 12, 2026"
            readTime="5 min read"
          />
          <PricingCard
            name="Monthly"
            price="$19"
            subtitle="/month"
            features={['Unlimited tool access', 'Export to PDF & Word', 'Priority support']}
          />
        </section>

        <section className="space-y-8">
          <ToolHero
            title="Resume Analyzer"
            description="Get AI-powered feedback on your resume in seconds."
            icon="resume"
          />
          <ToolUIContainer>
            <p className="text-sm font-semibold text-text-primary">Tool UI Container</p>
            <p className="text-sm text-text-secondary">
              Reuse this container across active tool states for consistent spacing and card style.
            </p>
          </ToolUIContainer>
          <PaywallBanner usesRemaining={0} />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-text-primary">FAQ Accordion</h2>
          <FAQAccordion items={pricingFaqs} />
        </section>
      </div>
    </div>
  )
}

