import Link from 'next/link'
import { notFound } from 'next/navigation'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { ArrowRightIcon } from '@/components/Icons'
import { blogPostBySlug } from '@/src/design/mockupData'

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = blogPostBySlug.get(slug)

  if (!post) {
    notFound()
  }

  return (
    <section className="px-4 py-16 lg:px-[370px]">
      <article className="mx-auto flex max-w-[700px] flex-col gap-8">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">{post.category.toUpperCase()}</p>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.2] text-text-primary">{post.title}</h1>
          <p className="mt-4 text-sm text-text-tertiary">
            {post.author} | {post.date} | {post.readTime}
          </p>
        </header>

        <div className="h-[380px] w-full rounded-lg bg-accent-light" />

        <div className="space-y-6 text-[17px] leading-[1.8] text-text-secondary">
          <p>{post.intro}</p>
          {post.sections.slice(0, 3).map((section) => (
            <div key={section.heading} className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5 rounded-lg border border-accent/20 bg-accent-light p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="px-0 py-0 tracking-[1px]" variant="default">
              FREE TOOL
            </Badge>
            <p className="mt-1 text-base font-semibold text-text-primary">Check your resume for these mistakes</p>
            <p className="mt-1 text-sm text-text-secondary">Use our free Resume Analyzer to get instant, AI-powered feedback.</p>
          </div>
          <Link href="/tools/resume-analyzer">
            <Button variant="primary">
              <ArrowRightIcon className="h-4 w-4" />
              Try Free
            </Button>
          </Link>
        </div>

        <div className="space-y-6 text-[17px] leading-[1.8] text-text-secondary">
          {post.sections.slice(3).map((section) => (
            <div key={section.heading} className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary">{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          ))}
        </div>

        <hr className="border-border" />

        <div className="rounded-lg bg-bg-dark p-8 text-center">
          <h3 className="text-xl font-bold text-text-on-dark">Want to fix your resume right now?</h3>
          <p className="mt-2 text-[15px] text-text-on-dark-muted">
            Try our free Resume Analyzer - get AI feedback in seconds.
          </p>
          <div className="mt-5 flex justify-center">
            <Link href="/tools/resume-analyzer">
              <Button variant="primary">
                <ArrowRightIcon className="h-4 w-4" />
                Analyze My Resume
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <Link href="/blog">
            <Button variant="ghost">Back to Blog</Button>
          </Link>
        </div>
      </article>
    </section>
  )
}