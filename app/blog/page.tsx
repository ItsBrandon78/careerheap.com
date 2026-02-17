import BlogCard from '@/components/BlogCard'
import CTASection from '@/components/CTASection'
import { blogPostTemplates } from '@/src/design/mockupData'

export default function BlogPage() {
  return (
    <>
      <section className="bg-bg-secondary px-4 py-section text-center lg:px-[170px]">
        <h1 className="text-[40px] font-bold text-text-primary">Career Tips & Insights</h1>
        <p className="mx-auto mt-4 max-w-[560px] text-lg text-text-secondary">
          Expert advice to help you land your next role faster.
        </p>
      </section>

      <section className="px-4 py-section lg:px-[170px]">
        <div className="mx-auto max-w-content">
          <div className="grid gap-6 md:grid-cols-3">
            {blogPostTemplates.map((post) => (
              <BlogCard
                key={post.slug}
                slug={post.slug}
                category={post.category}
                title={post.title}
                date={post.date}
                readTime={post.readTime}
              />
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Want to Get Ahead in Your Career?"
        subtitle="Use our tools to perfect your resume, ace interviews, and land the job you deserve."
        primaryButtonText="Try Our Tools"
      />
    </>
  )
}