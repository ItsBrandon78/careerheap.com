import Button from '@/components/Button';
import ToolCard from '@/components/ToolCard';
import CTASection from '@/components/CTASection';
import Link from 'next/link';

const tools = [
  {
    id: '1',
    title: 'Resume Analyzer',
    description: 'Get AI-powered feedback on your resume with actionable improvements.',
    slug: 'resume-analyzer',
    category: 'Career Tools',
    icon: '📄',
    isActive: true,
  },
  {
    id: '2',
    title: 'Cover Letter Writer',
    description: 'Create compelling cover letters tailored to job descriptions.',
    slug: 'cover-letter',
    category: 'Career Tools',
    icon: '✍️',
    isActive: false,
  },
  {
    id: '3',
    title: 'Interview Q&A Prep',
    description: 'Prepare for interviews with suggested answers and tips.',
    slug: 'interview-prep',
    category: 'Career Tools',
    icon: '🎤',
    isActive: false,
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-linear-to-r from-sky-50 to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Accelerate Your Career with AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            Smart, actionable tools to perfect your resume, ace interviews, and land your dream job.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/tools">
              <Button variant="primary" size="lg">
                Explore Tools
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>

          <p className="mt-8 text-sm text-gray-600">
            ✨ Try the first tool free. No credit card required.
          </p>
        </div>
      </section>

      {/* Featured Tools Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Our Tools
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Comprehensive career tools built for success
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={tool.title}
                description={tool.description}
                slug={tool.slug}
                category={tool.category}
                icon={tool.icon}
                isActive={tool.isActive}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose CareerHeap?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {[
              {
                title: 'AI-Powered Insights',
                description: 'Get intelligent feedback powered by advanced AI models.',
              },
              {
                title: 'Free to Start',
                description: 'Try 3 free uses on each tool. No credit card required.',
              },
              {
                title: 'Actionable Feedback',
                description: 'Receive specific, practical suggestions you can implement today.',
              },
              {
                title: 'Save Time',
                description: 'Automate tedious career preparation tasks and focus on what matters.',
              },
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection
        title="Ready to Transform Your Career?"
        subtitle="Start with the Resume Analyzer for free. No credit card required."
        primaryButtonText="Get Started"
        secondaryButtonText="Learn More"
      />
    </>
  );
}
