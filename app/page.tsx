import Link from 'next/link'
import Button from '@/components/Button'
import ToolCard from '@/components/ToolCard'
import BlogCard from '@/components/BlogCard'
import CTASection from '@/components/CTASection'
import Badge from '@/components/Badge'
import FeaturedToolCard from '@/components/FeaturedToolCard'
import { ArrowRightIcon, SparklesIcon } from '@/components/Icons'
import { featuredHomepageTool, homepageBlogs, homepageTools } from '@/src/design/mockupData'

export default function HomePage() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col items-center gap-8 text-center">
          <Badge className="gap-1.5" variant="default">
            <SparklesIcon className="h-3.5 w-3.5" />
            Free career tools - no sign-up required
          </Badge>

          <h1 className="text-[42px] font-bold leading-[1.15] text-text-primary md:text-[48px]">
            Smarter Career Moves
            <br />
            Start Here
          </h1>

          <p className="max-w-[580px] text-lg leading-[1.7] text-text-secondary">
            AI-powered tools and expert-written guides to help you write better resumes, ace interviews, and land your dream job - faster.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/tools/career-switch-planner">
              <Button variant="primary">
                <ArrowRightIcon className="h-4 w-4" />
                Start My Career Plan
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline">Browse Articles</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-section lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col items-center gap-12">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[1.5px] text-accent">FREE TOOLS</p>
            <h2 className="mt-2 text-[32px] font-bold text-text-primary">Career Tools That Actually Help</h2>
            <p className="mt-3 text-base text-text-secondary">Get 3 lifetime free uses total. No account needed.</p>
          </div>

          <FeaturedToolCard
            slug={featuredHomepageTool.slug}
            title={featuredHomepageTool.title}
            subtitle={featuredHomepageTool.description}
            primaryCta="Start My Career Plan"
            popularityLabel="Most Popular"
            usageLabel="3 Free Uses"
          />

          <div className="w-full">
            <p className="text-sm font-semibold text-text-secondary">More Tools</p>
          </div>

          <div className="grid w-full gap-6 md:grid-cols-3">
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

      <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[1.5px] text-accent">FROM THE BLOG</p>
              <h2 className="mt-2 text-[32px] font-bold text-text-primary">Latest Career Insights</h2>
            </div>
            <Link href="/blog" className="text-[15px] text-accent">
              View all articles -&gt;
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {homepageBlogs.map((blog) => (
              <BlogCard
                key={blog.slug}
                slug={blog.slug}
                category={blog.category}
                title={blog.title}
                date={blog.date}
                readTime={blog.readTime}
              />
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Unlock Unlimited Career Tools"
        subtitle="Stop guessing. Start getting results. Upgrade for unlimited access to every tool."
        primaryButtonText="Upgrade Now"
        primaryHref="/pricing"
      />
    </>
  )
}
