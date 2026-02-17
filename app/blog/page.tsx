import BlogCard from '@/components/BlogCard';
import CTASection from '@/components/CTASection';

const blogPosts = [
  {
    id: '1',
    title: 'How to Optimize Your Resume for ATS Systems',
    excerpt:
      'Learn how to format your resume to pass Applicant Tracking Systems and get in front of hiring managers.',
    slug: 'optimize-resume-ats',
    category: 'Resume Tips',
    date: '2024-02-10',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'The Best Questions to Ask in a Job Interview',
    excerpt:
      'Discover powerful questions that show you&apos;re engaged, thoughtful, and genuinely interested in the role.',
    slug: 'interview-questions-ask',
    category: 'Interview Prep',
    date: '2024-02-08',
    readTime: '6 min read',
  },
  {
    id: '3',
    title: '10 Cover Letter Mistakes to Avoid',
    excerpt:
      'Avoid common cover letter pitfalls that could cost you the job. Learn what hiring managers really want to see.',
    slug: 'cover-letter-mistakes',
    category: 'Cover Letters',
    date: '2024-02-05',
    readTime: '7 min read',
  },
  {
    id: '4',
    title: 'Building a Career Gap Narrative That Works',
    excerpt:
      'How to address gaps in your employment history in a way that hiring managers understand and respect.',
    slug: 'career-gap-narrative',
    category: 'Career Strategy',
    date: '2024-02-01',
    readTime: '8 min read',
  },
  {
    id: '5',
    title: 'Action Verbs That Make Your Resume Stand Out',
    excerpt:
      'Replace weak words with powerful action verbs that demonstrate impact and responsibility.',
    slug: 'action-verbs-resume',
    category: 'Resume Tips',
    date: '2024-01-28',
    readTime: '4 min read',
  },
  {
    id: '6',
    title: 'Negotiating Your First Offer: A Complete Guide',
    excerpt:
      'Get the salary and benefits you deserve. Learn negotiation strategies that actually work.',
    slug: 'negotiate-job-offer',
    category: 'Career Strategy',
    date: '2024-01-25',
    readTime: '10 min read',
  },
];

export default function BlogPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-linear-to-r from-sky-50 to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
            Career Tips & Insights
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            Expert advice to help you land your dream job
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <BlogCard
                key={post.id}
                title={post.title}
                excerpt={post.excerpt}
                slug={post.slug}
                category={post.category}
                date={post.date}
                readTime={post.readTime}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection
        title="Want to Get Ahead in Your Career?"
        subtitle="Use our tools to perfect your resume, ace interviews, and land the job you deserve."
        primaryButtonText="Try Our Tools"
      />
    </>
  );
}
