'use client'

import { notFound, useSearchParams } from 'next/navigation'
import { use, useEffect, useMemo, useState } from 'react'
import ToolHero from '@/components/ToolHero'
import ToolUIContainer from '@/components/ToolUIContainer'
import PaywallBanner from '@/components/PaywallBanner'
import FAQAccordion from '@/components/FAQAccordion'
import ToolCard from '@/components/ToolCard'
import Button from '@/components/Button'
import { SparklesIcon, ToolGlyph } from '@/components/Icons'
import { relatedTools, toolFaqs } from '@/src/design/mockupData'
import { useToolUsage, type ToolUsageResult } from '@/lib/hooks/useToolUsage'
import { analyzeResume } from '@/lib/analysis/resume'
import { useAuth } from '@/lib/auth/context'

interface ToolPageProps {
  params: Promise<{
    slug: string
  }>
}

interface ToolPageTemplateProps {
  slug: string
  locked?: boolean
}

const FREE_LIMIT = 3

const toolMap = {
  'resume-analyzer': {
    title: 'Resume Analyzer',
    description:
      'Get AI-powered feedback on your resume in seconds. Identify gaps, improve wording, and stand out to recruiters.',
    icon: 'resume' as const,
    cta: 'Analyze Resume',
    label: 'Paste your resume text below',
    placeholder: 'Paste your resume content here...'
  },
  'cover-letter': {
    title: 'Cover Letter Writer',
    description:
      'Create a personalized cover letter in seconds. Just paste the job listing and your relevant experience.',
    icon: 'cover' as const,
    cta: 'Generate Cover Letter',
    label: 'Paste the job listing below',
    placeholder: 'Paste the job description here...'
  },
  'interview-prep': {
    title: 'Interview Q&A Prep',
    description:
      'Generate tailored interview questions and answers based on any job description.',
    icon: 'interview' as const,
    cta: 'Generate Interview Prep',
    label: 'Paste role and company details',
    placeholder: 'Paste the role details here...'
  }
}

const benefits = [
  {
    icon: 'zap' as const,
    title: 'Instant Feedback',
    description: 'Get detailed analysis in under 10 seconds.'
  },
  {
    icon: 'target' as const,
    title: 'Actionable Tips',
    description: 'Specific suggestions, not vague advice.'
  },
  {
    icon: 'shield' as const,
    title: 'ATS-Optimized',
    description: 'Checks formatting for applicant tracking systems.'
  }
]

function toUsageLabel(
  usage: ToolUsageResult | null,
  previewLocked: boolean,
  planFallback: 'free' | 'pro' | 'lifetime'
) {
  if (previewLocked) return 'Locked Preview'
  if (planFallback === 'lifetime') return 'Lifetime Access'
  if (planFallback === 'pro') return 'Unlimited Access'
  if (usage?.isUnlimited) return usage.plan === 'lifetime' ? 'Lifetime Access' : 'Unlimited Access'
  const remaining = usage?.usesRemaining ?? FREE_LIMIT
  return `${remaining} Free Uses Left`
}

export function ToolPageTemplate({ slug, locked = false }: ToolPageTemplateProps) {
  const searchParams = useSearchParams()
  const tool = toolMap[slug as keyof typeof toolMap]
  const { getUsage, consumeUsage } = useToolUsage()
  const { user, plan } = useAuth()

  const previewLocked = locked || searchParams.get('locked') === '1'
  const usageQuery = useMemo(() => {
    const qp = new URLSearchParams()
    const plan = searchParams.get('plan')
    const uses = searchParams.get('uses')
    if (plan) qp.set('plan', plan)
    if (uses) qp.set('uses', uses)
    return qp.toString()
  }, [searchParams])

  const [usage, setUsage] = useState<ToolUsageResult | null>(null)
  const [input, setInput] = useState('')
  const [resultText, setResultText] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUsageLoading, setIsUsageLoading] = useState(true)

  if (!tool) {
    notFound()
  }

  useEffect(() => {
    let active = true

    const loadUsage = async () => {
      setIsUsageLoading(true)
      const result = await getUsage(slug, usageQuery)
      if (active && result) {
        setUsage(result)
      }
      if (active) {
        setIsUsageLoading(false)
      }
    }

    void loadUsage()

    return () => {
      active = false
    }
  }, [getUsage, slug, usageQuery])

  const defaultResult = useMemo(
    () =>
      `Your resume is well-structured overall. Here are key areas for improvement:\n\n- Add quantifiable metrics to your experience section\n- Your skills section could be more targeted to the role\n- Consider adding a brief professional summary`,
    []
  )

  const hasPaidPlan = plan === 'pro' || plan === 'lifetime'
  const isLocked = previewLocked || (!hasPaidPlan && (usage ? !usage.canUse : false))
  const displayResult = resultText || defaultResult

  const handleSubmit = async () => {
    if (isLocked || !input.trim() || isUsageLoading) {
      return
    }

    if (!user) {
      setResultText('Sign in to run this tool and save your usage history.')
      return
    }

    setIsProcessing(true)

    try {
      if (slug === 'resume-analyzer') {
        const result = await analyzeResume(input)
        const summary = [
          `Overall score: ${result.overallScore}/100`,
          '',
          'Top strengths:',
          ...result.strengths.slice(0, 3).map((item) => `- ${item}`),
          '',
          'Priority improvements:',
          ...result.improvements.slice(0, 3).map((item) => `- ${item}`)
        ].join('\n')
        setResultText(summary)
      } else {
        setResultText(defaultResult)
      }

      const nextUsage = await consumeUsage(slug, usageQuery)
      if (nextUsage) {
        setUsage(nextUsage)
      }
    } catch {
      setResultText(defaultResult)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <ToolHero
        title={tool.title}
        description={tool.description}
        icon={tool.icon}
        usesLabel={toUsageLabel(usage, previewLocked, plan)}
      />

      <section className="w-full px-4 py-16 lg:px-[170px]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-8">
          <h2 className="text-center text-[22px] font-semibold text-text-primary">Why professionals love this tool</h2>
          <div className="grid w-full gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="flex h-full flex-col gap-3 rounded-lg bg-bg-secondary p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-light text-accent">
                  <ToolGlyph kind={benefit.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary">{benefit.title}</h3>
                <p className="text-sm leading-[1.5] text-text-secondary">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-16 lg:px-[340px]">
        {isLocked ? (
          <PaywallBanner usesRemaining={0} />
        ) : (
          <ToolUIContainer>
            <label htmlFor="tool-input" className="text-sm font-semibold text-text-primary">
              {tool.label}
            </label>

            <textarea
              id="tool-input"
              rows={8}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={tool.placeholder}
              className="w-full rounded-md border border-border bg-bg-secondary p-4 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />

            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isProcessing}
                disabled={isUsageLoading || !input.trim() || !user}
              >
                <SparklesIcon className="h-4 w-4" />
                {!user ? 'Sign In to Continue' : tool.cta}
              </Button>
              <p className="text-[13px] text-text-tertiary">
                {usage?.isUnlimited
                  || hasPaidPlan
                  ? plan === 'lifetime' || usage?.plan === 'lifetime'
                    ? 'Lifetime unlimited access'
                    : 'Pro unlimited access'
                  : `${usage?.usesRemaining ?? FREE_LIMIT} of ${FREE_LIMIT} free uses remaining`}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-text-primary">Analysis Results</p>
              <div className="rounded-md border border-border bg-bg-secondary p-5">
                <p className="whitespace-pre-line text-sm leading-[1.7] text-text-secondary">{displayResult}</p>
              </div>
            </div>
          </ToolUIContainer>
        )}
      </section>

      <section className="w-full px-4 py-16 lg:px-[340px]">
        <div className="mx-auto w-full max-w-tool">
          <h2 className="text-center text-2xl font-bold text-text-primary">Frequently Asked Questions</h2>
          <FAQAccordion items={toolFaqs} className="mt-8" compact={isLocked} />
        </div>
      </section>

      <section className="w-full bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-8">
          <h2 className="text-2xl font-bold text-text-primary">More Career Tools</h2>
          <div className="grid w-full gap-6 md:grid-cols-3">
            {relatedTools.map((related) => (
              <ToolCard
                key={related.slug}
                slug={related.slug}
                title={related.title}
                description={related.description}
                icon={related.icon}
                isActive={related.isActive}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default function ToolPage({ params }: ToolPageProps) {
  const { slug } = use(params)
  return <ToolPageTemplate slug={slug} />
}
