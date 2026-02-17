import ToolCard from '@/components/ToolCard';
import CTASection from '@/components/CTASection';

const allTools = [
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

export default function ToolsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-linear-to-r from-sky-50 to-blue-50 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
            Career Tools
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
            Comprehensive AI-powered tools to accelerate your career growth
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {allTools.map((tool) => (
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

          {/* Coming Soon */}
          <div className="mt-16 text-center">
            <p className="text-gray-600">
              🚀 More tools coming soon! Check back for updates.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection
        title="Ready to Get Started?"
        subtitle="Use the Resume Analyzer for free today. No credit card required."
        primaryButtonText="Try for Free"
      />
    </>
  );
}
