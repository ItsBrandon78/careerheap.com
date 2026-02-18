import ToolCard from '@/components/ToolCard'
import CTASection from '@/components/CTASection'
import FeaturedToolCard from '@/components/FeaturedToolCard'
import { featuredHomepageTool, homepageTools } from '@/src/design/mockupData'

export default function ToolsPage() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-section text-center lg:px-[170px]">
        <h1 className="text-[40px] font-bold text-text-primary">Career Tools</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-lg text-text-secondary">
          Comprehensive AI-powered tools to accelerate your career growth.
        </p>
      </section>

      <section className="px-4 py-section lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <FeaturedToolCard
            slug={featuredHomepageTool.slug}
            title={featuredHomepageTool.title}
            subtitle={featuredHomepageTool.description}
            primaryCta="Start My Career Plan"
            popularityLabel="Most Popular"
            usageLabel="3 Free Uses"
          />

          <h2 className="mt-10 text-sm font-semibold text-text-secondary">More Tools</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {homepageTools.map((tool) => (
              <ToolCard
                key={tool.slug}
                slug={tool.slug}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                isActive={tool.isActive}
              />
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to Get Started?"
        subtitle="Use the Resume Analyzer for free today. No credit card required."
        primaryButtonText="Try for Free"
        primaryHref="/tools/career-switch-planner"
      />
    </>
  )
}
