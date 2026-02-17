'use client';

import ToolHero from '@/components/ToolHero';
import PaywallBanner from '@/components/PaywallBanner';
import Button from '@/components/Button';
import { notFound } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToolUsage } from '@/lib/hooks/useToolUsage';
import { useAuth } from '@/lib/auth/context';
import ResumeResults from '@/components/ResumeResults';
import { analyzeResume, ResumeAnalysis } from '@/lib/analysis/resume';

interface ToolPageProps {
  params: {
    slug: string;
  };
}

const tools: Record<
  string,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: string;
  }
> = {
  'resume-analyzer': {
    title: 'Resume Analyzer',
    subtitle: 'Get AI-powered feedback on your resume',
    description:
      'Our AI analyzes your resume for ATS compatibility, content quality, and impact. Get actionable suggestions to improve your chances of landing interviews.',
    icon: '📄',
  },
  'cover-letter': {
    title: 'Cover Letter Writer',
    subtitle: 'Create compelling cover letters in minutes',
    description:
      'Generate tailored cover letters for specific job descriptions. Our AI ensures your letter highlights the most relevant skills and experiences.',
    icon: '✍️',
  },
  'interview-prep': {
    title: 'Interview Q&A Prep',
    subtitle: 'Ace your next interview',
    description:
      'Get prepared for common and role-specific interview questions. Our AI provides thoughtful answers and tips to help you shine.',
    icon: '🎤',
  },
};

export default function ToolPage({ params }: ToolPageProps) {
  const tool = tools[params.slug];
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ usesRemaining: number; canUse: boolean } | null>(null);
  const [results, setResults] = useState<ResumeAnalysis | null>(null);
  const { checkUsage } = useToolUsage();
  const { isPro } = useAuth();

  useEffect(() => {
    const initializeUsage = async () => {
      const result = await checkUsage(params.slug);
      if (result) {
        setUsageInfo(result);
      }
    };
    initializeUsage();
  }, [params.slug, checkUsage]);

  if (!tool) {
    notFound();
  }

  const handleSubmit = async () => {
    if (!input.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await checkUsage(params.slug);

      if (!result || !result.canUse) {
        alert(
          isPro
            ? 'An error occurred. Please try again.'
            : 'You&apos;ve reached your free usage limit. Upgrade to Pro for unlimited access.'
        );
        return;
      }

      // Run analysis
      if (params.slug === 'resume-analyzer') {
        const analysis = await analyzeResume(input);
        setResults(analysis);
      } else {
        alert(`${tool.title} analysis coming soon!`);
      }

      setUsageInfo({ usesRemaining: result.usesRemaining, canUse: result.canUse });
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ToolHero
        title={tool.title}
        subtitle={tool.subtitle}
        description={tool.description}
        icon={tool.icon}
      />

      {/* Tool Interface */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Usage Banner */}
          {usageInfo && (
            <PaywallBanner
              usesRemaining={usageInfo.usesRemaining}
              totalUses={isPro ? 0 : 3}
              className="mb-8"
            />
          )}

          {/* Results Display */}
          {results ? (
            <>
              <ResumeResults analysis={results} className="mb-12" />

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setResults(null);
                    setInput('');
                  }}
                >
                  Analyze Another Resume
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Tool-Specific Content */}
              <div className="rounded-lg border border-surface bg-card p-8">
                <h2 className="text-2xl font-bold text-navy">
                  {params.slug === 'resume-analyzer' && 'Analyze Your Resume'}
                  {params.slug === 'cover-letter' && 'Write Your Cover Letter'}
                  {params.slug === 'interview-prep' && 'Prepare for Your Interview'}
                </h2>

                <p className="mt-4 text-muted">
                  {params.slug === 'resume-analyzer' &&
                    'Paste your resume content below to get AI-powered feedback and improvement suggestions.'}
                  {params.slug === 'cover-letter' &&
                    'Paste the job description and tell us about your experience. We&apos;ll generate a tailored cover letter.'}
                  {params.slug === 'interview-prep' &&
                    'Enter the job title and company. We&apos;ll provide common interview questions and suggested answers.'}
                </p>

                <div className="mt-8 space-y-6">
                  <div>
                    <label htmlFor="input" className="block text-sm font-medium text-navy">
                      {params.slug === 'resume-analyzer' && 'Your Resume'}
                      {params.slug === 'cover-letter' && 'Job Description'}
                      {params.slug === 'interview-prep' && 'Job Details'}
                    </label>
                    <textarea
                      id="input"
                      rows={10}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-surface bg-surface px-4 py-3 text-navy placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={
                        params.slug === 'resume-analyzer'
                          ? 'Paste your resume here...'
                          : params.slug === 'cover-letter'
                            ? 'Paste the job description here...'
                            : 'Enter job title and company...'
                      }
                      disabled={isProcessing || (usageInfo !== null && !usageInfo.canUse && !isPro)}
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleSubmit}
                    isLoading={isProcessing}
                    disabled={isProcessing || (usageInfo !== null && !usageInfo.canUse && !isPro)}
                  >
                    {params.slug === 'resume-analyzer' && 'Analyze Resume'}
                    {params.slug === 'cover-letter' && 'Generate Cover Letter'}
                    {params.slug === 'interview-prep' && 'Get Interview Questions'}
                  </Button>

                        {usageInfo !== null && !usageInfo.canUse && !isPro && (
                          <div className="rounded-lg bg-card border border-surface p-4 text-sm">
                            <p className="font-medium text-navy">You&apos;ve used all your free uses for this tool.</p>
                            <p className="mt-1 text-muted">
                              Upgrade to Pro for unlimited access to all tools.
                            </p>
                          </div>
                        )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
