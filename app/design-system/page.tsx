import Badge from '@/components/Badge'
import BlogCard from '@/components/BlogCard'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Image from 'next/image'
import FAQAccordion from '@/components/FAQAccordion'
import PaywallBanner from '@/components/PaywallBanner'
import PricingCard from '@/components/PricingCard'
import ToolCard from '@/components/ToolCard'
import ToolHero from '@/components/ToolHero'
import ToolUIContainer from '@/components/ToolUIContainer'
import BrandLogo from '@/components/BrandLogo'
import { pricingFaqs } from '@/src/design/mockupData'

export default function DesignSystemPage() {
  return (
    <div className="bg-bg-primary px-4 py-10 lg:px-10">
      <div className="mx-auto flex max-w-wide flex-col gap-12">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold text-text-primary">CareerHeap Brand System</h1>
          <p className="max-w-[760px] text-sm text-text-secondary">
            Premium SaaS identity built for strategic career transitions. The system below includes logo exports, tokenized colors, component behavior, and screen-level consistency.
          </p>
          <div className="grid gap-4 rounded-lg border border-border bg-surface p-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Primary logo</p>
              <Image src="/brand/careerheap-logo.svg" alt="CareerHeap logo" width={220} height={40} className="h-10 w-auto" />
              <p className="text-xs text-text-tertiary">Wordmark + abstract progression symbol.</p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Monochrome / dark mode</p>
              <Image src="/brand/careerheap-logo-mono.svg" alt="CareerHeap monochrome logo" width={220} height={40} className="h-10 w-auto" />
              <div className="inline-flex rounded-md bg-bg-dark px-3 py-2">
                <Image src="/brand/careerheap-logo-white.svg" alt="CareerHeap white logo" width={190} height={28} className="h-7 w-auto" />
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Primary brand</p>
              <div className="mt-2 h-12 rounded-md bg-accent" />
              <p className="mt-2 text-xs text-text-secondary">#245DFF</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Secondary accent</p>
              <div className="mt-2 h-12 rounded-md bg-accent-secondary" />
              <p className="mt-2 text-xs text-text-secondary">#0EA5A4</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Neutral dark</p>
              <div className="mt-2 h-12 rounded-md bg-bg-dark" />
              <p className="mt-2 text-xs text-text-secondary">#0A1324</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Border / focus</p>
              <div className="mt-2 h-12 rounded-md border-2 border-focus-ring bg-border" />
              <p className="mt-2 text-xs text-text-secondary">#D9E2F0 / #7EA0FF</p>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Component Foundations</h2>
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

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Header Mockup</h2>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
              <BrandLogo size="sm" />
              <nav className="hidden items-center gap-7 text-[15px] text-text-secondary md:flex">
                <span>Tools</span>
                <span>Pricing</span>
                <span>Blog</span>
              </nav>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm">Log In</Button>
                <Button variant="primary" size="sm">Try Free</Button>
              </div>
            </div>
            <div className="bg-bg-secondary px-5 py-8">
              <p className="max-w-[620px] text-sm text-text-secondary">
                Consistent logo placement, button hierarchy, border rhythm, and brand-driven spacing.
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Dashboard Mockup</h2>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Navigation</p>
              <div className="rounded-md bg-accent-light px-3 py-2 text-sm font-medium text-accent">Career Switch Planner</div>
              <div className="rounded-md px-3 py-2 text-sm text-text-secondary">Resume Reframe</div>
              <div className="rounded-md px-3 py-2 text-sm text-text-secondary">Progress Tracking</div>
            </Card>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs text-text-tertiary">Readiness score</p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">78</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-text-tertiary">Top bottleneck</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">Licensing timeline clarity</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-text-tertiary">Weekly momentum</p>
                  <p className="mt-2 text-sm font-semibold text-accent-secondary">+4 planned actions</p>
                </Card>
              </div>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[1.2px] text-text-tertiary">Bridge Plan</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border border-border-light bg-bg-secondary p-3 text-sm text-text-secondary">0-30 days: role match + proof baseline</div>
                  <div className="rounded-md border border-border-light bg-bg-secondary p-3 text-sm text-text-secondary">1-3 months: certs + portfolio artifacts</div>
                  <div className="rounded-md border border-border-light bg-bg-secondary p-3 text-sm text-text-secondary">3-6 months: interview conversion loop</div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Login Mockup</h2>
          <Card className="mx-auto w-full max-w-[460px] p-7">
            <div className="text-center">
              <BrandLogo size="sm" showWordmark />
              <h3 className="mt-4 text-[28px] font-bold text-text-primary">Sign In</h3>
              <p className="mt-2 text-sm text-text-secondary">Access your tools and saved transition plans.</p>
            </div>
            <div className="mt-6 space-y-3">
              <Button variant="outline" className="w-full">Continue with Google</Button>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-bg-secondary p-1">
                <div className="rounded-md bg-surface px-3 py-2 text-center text-sm font-semibold text-text-primary">Magic Link</div>
                <div className="px-3 py-2 text-center text-sm font-semibold text-text-secondary">Password</div>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-4 py-3 text-sm text-text-tertiary">you@example.com</div>
              <Button className="w-full">Send Magic Link</Button>
            </div>
          </Card>
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
            name="Pro"
            price="$7"
            subtitle="/month"
            badge="Most Popular"
            features={['Unlimited tool uses', 'Resume upload', 'Full roadmap output']}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Pricing Mockup</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              subtitle="/forever"
              features={['3 lifetime analyses', 'Manual input', 'Basic roadmap']}
            />
            <PricingCard
              name="Pro"
              price="$7"
              subtitle="/month"
              badge="Most Popular"
              features={['Unlimited analyses', 'Resume upload + OCR', 'Export + progress tracking']}
            />
            <PricingCard
              name="Lifetime"
              price="$49"
              subtitle="one-time"
              features={['Everything in Pro', 'No recurring fees', 'Priority support']}
            />
          </div>
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
