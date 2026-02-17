import Link from 'next/link';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { notFound } from 'next/navigation';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

const blogPosts: Record<
  string,
  {
    title: string;
    category: string;
    date: string;
    readTime: string;
    content: string;
  }
> = {
  'optimize-resume-ats': {
    title: 'How to Optimize Your Resume for ATS Systems',
    category: 'Resume Tips',
    date: '2024-02-10',
    readTime: '5 min read',
    content: `
      <h2>What is an ATS?</h2>
      <p>An Applicant Tracking System (ATS) is software used by most large companies to screen resumes before they reach human eyes. Learning to optimize for ATS is crucial in today&apos;s job market.</p>
      
      <h2>Key Optimization Tips</h2>
      <h3>1. Use Clear Formatting</h3>
      <p>Avoid tables, columns, and graphics that ATS systems can&apos;t read. Stick to simple, single-column layouts with standard fonts.</p>
      
      <h3>2. Include Keywords</h3>
      <p>Mirror keywords from the job description in your resume. ATS systems scan for specific words related to skills, certifications, and experience.</p>
      
      <h3>3. Use Standard Section Headers</h3>
      <p>Use common section titles like "Professional Experience," "Education," and "Skills." Avoid creative alternatives that might confuse the ATS.</p>
      
      <h2>Conclusion</h2>
      <p>Optimizing your resume for ATS systems doesn&apos;t mean sacrificing quality. Focus on clarity, keywords, and standard formatting to ensure your resume gets past the first screening stage.</p>
    `,
  },
  'interview-questions-ask': {
    title: 'The Best Questions to Ask in a Job Interview',
    category: 'Interview Prep',
    date: '2024-02-08',
    readTime: '6 min read',
    content: `
      <h2>Why Asking Questions Matters</h2>
      <p>Asking thoughtful questions shows genuine interest in the role and company. It&apos;s also your chance to evaluate whether the job is right for you.</p>
      
      <h2>Top Questions to Ask</h2>
      <h3>About the Role</h3>
      <ul>
        <li>What does success look like in this position?</li>
        <li>How does this role contribute to the team&apos;s goals?</li>
        <li>What are the biggest challenges for someone in this position?</li>
      </ul>
      
      <h3>About the Team</h3>
      <ul>
        <li>Can you tell me about the team I&apos;d be working with?</li>
        <li>How does the team collaborate?</li>
        <li>What&apos;s the management style like?</li>
      </ul>
      
      <h2>Questions to Avoid</h2>
      <p>Don&apos;t ask about salary, benefits, or vacation days in the first interview. Save these for after you have an offer.</p>
    `,
  },
  'cover-letter-mistakes': {
    title: '10 Cover Letter Mistakes to Avoid',
    category: 'Cover Letters',
    date: '2024-02-05',
    readTime: '7 min read',
    content: `
      <h2>Common Cover Letter Mistakes</h2>
      <h3>1. Making It Too Generic</h3>
      <p>Personalize each cover letter for the specific company and role. Generic letters are obvious to hiring managers.</p>
      
      <h3>2. Being Too Long</h3>
      <p>Keep your cover letter to 3-4 paragraphs. Hiring managers spend seconds reviewing each letter.</p>
      
      <h3>3. Repeating Your Resume</h3>
      <p>Your cover letter should add context and personality, not just repeat what&apos;s on your resume.</p>
      
      <h2>Tips for Success</h2>
      <p>Focus on what you can bring to the company, show enthusiasm for the role, and make it easy to read with clear structure.</p>
    `,
  },
  'career-gap-narrative': {
    title: 'Building a Career Gap Narrative That Works',
    category: 'Career Strategy',
    date: '2024-02-01',
    readTime: '8 min read',
    content: `
      <h2>Addressing Career Gaps</h2>
      <p>Career gaps are increasingly common and less of a red flag than they used to be. The key is having a clear, honest narrative.</p>
      
      <h2>How to Frame Your Gap</h2>
      <p>Be honest about what happened, but focus on what you learned or accomplished during the gap. Whether it was personal, health-related, or educational, frame it positively.</p>
      
      <h2>In Your Cover Letter</h2>
      <p>Briefly address the gap proactively. Show that you&apos;re ready and motivated to return to work.</p>
    `,
  },
  'action-verbs-resume': {
    title: 'Action Verbs That Make Your Resume Stand Out',
    category: 'Resume Tips',
    date: '2024-01-28',
    readTime: '4 min read',
    content: `
      <h2>Why Action Verbs Matter</h2>
      <p>Strong action verbs convey impact and responsibility. They make your achievements more compelling and memorable.</p>
      
      <h2>Powerful Action Verbs</h2>
      <p>Instead of "Responsible for," use: Led, Managed, Orchestrated, Spearheaded, Directed</p>
      <p>Instead of "Helped with," use: Collaborated with, Partnered with, Contributed to, Worked alongside</p>
      <p>Instead of "Worked on," use: Implemented, Developed, Created, Designed, Built</p>
      
      <h2>Pro Tip</h2>
      <p>Use different verbs for each bullet point. This creates more visual interest and shows versatility.</p>
    `,
  },
  'negotiate-job-offer': {
    title: 'Negotiating Your First Offer: A Complete Guide',
    category: 'Career Strategy',
    date: '2024-01-25',
    readTime: '10 min read',
    content: `
      <h2>You Deserve to Negotiate</h2>
      <p>Many candidates feel uncomfortable negotiating, but it&apos;s expected and accepted. Employers budget for negotiation.</p>
      
      <h2>Preparation Is Key</h2>
      <p>Research typical salaries for your role, location, and experience level. Know your worth before you negotiate.</p>
      
      <h2>Negotiation Tips</h2>
      <p>Ask for the offer in writing. Don&apos;t accept immediately. Thank them and ask for time to consider. Then, present your counteroffer with data to support your request.</p>
      
      <h2>Negotiate Beyond Salary</h2>
      <p>Consider benefits, work flexibility, professional development, bonus potential, and start date.</p>
    `,
  },
};

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = blogPosts[params.slug];

  if (!post) {
    notFound();
  }

  return (
    <>
      {/* Post Header */}
      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <Badge variant="info">{post.category}</Badge>
            <span className="text-sm text-gray-600">{post.readTime}</span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            {post.title}
          </h1>

          <time dateTime={post.date} className="mt-4 block text-sm text-gray-600">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
      </article>

      {/* Post Content */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div
            className="prose prose-lg max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </section>

      {/* Navigation */}
      <section className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link href="/blog">
            <Button variant="ghost">← Back to Blog</Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to apply these tips?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Try our career tools for free to optimize your resume, craft a compelling cover letter, and ace your interviews.
          </p>
          <Link href="/tools" className="mt-8 inline-block">
            <Button variant="primary" size="lg">
              Get Started with Our Tools
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
