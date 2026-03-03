import Link from 'next/link'
import Button from '@/components/Button'
import BlogCard from '@/components/BlogCard'
import CTASection from '@/components/CTASection'
import Badge from '@/components/Badge'
import FeaturedToolCard from '@/components/FeaturedToolCard'
import Card from '@/components/Card'
import { ArrowRightIcon, SparklesIcon } from '@/components/Icons'
import { formatPublishedDate, toReadTimeLabel } from '@/lib/blog/utils'
import { getAllBlogPosts } from '@/lib/sanity/api'
import { featuredHomepageTool } from '@/src/design/mockupData'

export default async function HomePage() {
  const latestPosts = (await getAllBlogPosts()).slice(0, 3)

  return (
    <>
      <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col items-center gap-8 text-center">
          <Badge className="gap-1.5" variant="default">
            <SparklesIcon className="h-3.5 w-3.5" />
            Canada-first career planning
          </Badge>

          <h1 className="text-[42px] font-bold leading-[1.15] text-text-primary md:text-[48px]">
            Every Canadian Career Pathway.
            <br />
            Step-by-Step.
          </h1>

          <p className="max-w-[580px] text-lg leading-[1.7] text-text-secondary">
            Province-aware career roadmaps, real timelines, certification requirements, and salary progression that help you see the path before you commit.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/tools/career-switch-planner">
              <Button variant="primary">
                <ArrowRightIcon className="h-4 w-4" />
                Explore Your Path
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline">View Top Canadian Careers</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-section lg:px-[170px]">
        <div className="mx-auto flex max-w-content flex-col items-center gap-12">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[1.5px] text-accent">HOW IT WORKS</p>
            <h2 className="mt-2 text-[32px] font-bold text-text-primary">A Clear Path, Not Vague Advice</h2>
            <p className="mt-3 text-base text-text-secondary">Choose a career. Select your province. Get a structured roadmap.</p>
          </div>

          <div className="grid w-full gap-6 md:grid-cols-3">
            {[
              ['Choose a Career', 'Pick the role you want and compare it against a real pathway, not just a job title.'],
              ['Select Your Province', 'Default to Ontario, then view wages, regulation, and requirements through that local lens.'],
              ['Get a Structured Roadmap', 'See time to eligibility, certification checkpoints, salary progression, and the next 7 days.']
            ].map(([title, detail]) => (
              <Card key={title} className="p-6">
                <p className="text-xs font-semibold tracking-[1.5px] text-accent">{title}</p>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{detail}</p>
              </Card>
            ))}
          </div>

          <FeaturedToolCard
            slug={featuredHomepageTool.slug}
            title={featuredHomepageTool.title}
            subtitle={featuredHomepageTool.description}
            primaryCta="Explore Your Path"
            popularityLabel="Canada-First"
            usageLabel="Province Aware"
          />

          <div className="w-full">
            <p className="text-sm font-semibold text-text-secondary">What You Get</p>
          </div>

          <div className="grid w-full gap-6 md:grid-cols-3">
            {[
              'Time to qualification',
              'Real certification requirements',
              'Salary progression',
              'Province-specific regulation',
              'Difficulty rating',
              'Cost estimate'
            ].map((item) => (
              <Card key={item} className="flex items-center justify-center p-4 text-center">
                <p className="text-sm font-medium text-text-primary">{item}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[1.5px] text-accent">POPULAR PATHWAYS</p>
            <h2 className="mt-2 text-[32px] font-bold text-text-primary">Start With Proven Ontario Paths</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {[
              { title: 'Electrician (ON)', tag: 'Trade apprenticeship' },
              { title: 'RN (ON)', tag: 'Regulated profession' },
              { title: 'HVAC (ON)', tag: 'Trade apprenticeship' },
              { title: 'Software Dev (Canada)', tag: 'Transition-friendly' },
              { title: 'AZ Driver (ON)', tag: 'Licence-first route' }
            ].map((path) => (
              <Link key={path.title} href="/tools/career-switch-planner">
                <Card className="h-full p-4 transition-transform duration-200 hover:-translate-y-0.5">
                  <p className="text-xs font-semibold tracking-[1.5px] text-accent">{path.tag}</p>
                  <p className="mt-3 text-base font-semibold text-text-primary">{path.title}</p>
                </Card>
              </Link>
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
            {latestPosts.length > 0 ? (
              latestPosts.map((post) => (
                <BlogCard
                  key={post.slug}
                  slug={post.slug}
                  category={post.category.title}
                  title={post.title}
                  date={formatPublishedDate(post.publishedAt)}
                  readTime={toReadTimeLabel(post.readTimeMinutes)}
                  excerpt={post.excerpt}
                  authorName={post.authorName}
                  coverImageUrl={post.coverImage?.url || null}
                />
              ))
            ) : (
              <div className="md:col-span-3 rounded-lg border border-border bg-surface px-6 py-8 text-center">
                <h3 className="text-xl font-bold text-text-primary">No posts yet - coming this week</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  We&apos;re publishing practical career guides soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <CTASection
        title="Build a Clearer Canadian Career Plan"
        subtitle="See the pathway, the province-specific requirements, and the next action before you guess your next move."
        primaryButtonText="View Pricing"
        primaryHref="/pricing"
      />
    </>
  )
}
