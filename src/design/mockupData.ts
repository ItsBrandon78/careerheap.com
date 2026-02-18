export type ToolIcon = 'resume' | 'interview' | 'cover' | 'job' | 'planner'

export interface ToolSummary {
  slug: string
  title: string
  description: string
  icon: ToolIcon
  isActive?: boolean
}

export const featuredHomepageTool: ToolSummary = {
  slug: 'career-switch-planner',
  title: 'Career Switch Planner',
  description: 'See how your skills transfer - and get a step-by-step plan.',
  icon: 'planner',
  isActive: true
}

export const homepageTools: ToolSummary[] = [
  {
    slug: 'resume-analyzer',
    title: 'Resume Analyzer',
    description:
      'Get instant AI feedback on your resume - fix weak spots, improve wording, and stand out.',
    icon: 'resume',
    isActive: true
  },
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    description:
      'Generate tailored interview questions and answers based on any job description.',
    icon: 'interview',
    isActive: true
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    description:
      'Create a personalized cover letter in seconds. Just paste the job listing.',
    icon: 'cover',
    isActive: true
  }
]

export interface BlogSummary {
  slug: string
  category: string
  title: string
  date: string
  readTime: string
}

export const homepageBlogs: BlogSummary[] = [
  {
    slug: 'resume-mistakes-cost-interviews',
    category: 'Career Tips',
    title: '10 Resume Mistakes That Cost You Interviews',
    date: 'Feb 12, 2026',
    readTime: '5 min read'
  },
  {
    slug: 'tell-me-about-yourself-2026',
    category: 'Interviews',
    title: "How to Answer 'Tell Me About Yourself' in 2026",
    date: 'Feb 8, 2026',
    readTime: '7 min read'
  },
  {
    slug: 'ai-cover-letters-work',
    category: 'Tools',
    title: 'AI Cover Letters: Do They Actually Work?',
    date: 'Feb 3, 2026',
    readTime: '4 min read'
  }
]

export interface PricingPlan {
  name: string
  price: string
  subtitle: string
  highlighted?: boolean
  badge?: string
  buttonText?: string
  features: string[]
}

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'For trying CareerHeap',
    buttonText: 'Try Free',
    features: ['3 lifetime uses total', 'Manual paste input', 'Basic report preview']
  },
  {
    name: 'Pro',
    price: '$7',
    subtitle: '/month',
    highlighted: true,
    badge: 'Most Popular',
    buttonText: 'Upgrade to Pro',
    features: [
      'Unlimited tool uses',
      'Resume upload (PDF/DOCX)',
      'Full career roadmap',
      'Resume reframe generation'
    ]
  },
  {
    name: 'Lifetime',
    price: '$49',
    subtitle: 'One-time payment',
    buttonText: 'Get Lifetime Access',
    features: [
      'Everything in Pro',
      'No recurring billing',
      'Optional Early Supporter badge'
    ]
  }
]

export const pricingFaqs = [
  {
    question: 'Can I try before I buy?',
    answer:
      'Yes. Free includes 3 total lifetime uses across all tools with no credit card required.'
  },
  {
    question: 'What unlocks with Pro?',
    answer:
      'Pro gives unlimited uses, resume upload, full roadmap outputs, and resume reframing.'
  },
  {
    question: 'How is Lifetime different?',
    answer:
      'Lifetime includes everything in Pro with a single one-time payment and no recurring billing.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We support major credit cards and secure checkout powered by Stripe.'
  }
]

export const toolFaqs = [
  {
    question: 'How does the free trial work?',
    answer:
      'Free includes 3 total lifetime uses shared across all tools with no credit card required.'
  },
  {
    question: 'Is my resume data stored?',
    answer:
      'No. Resume text is processed for analysis and not stored as permanent profile data.'
  },
  {
    question: 'What makes this different from other tools?',
    answer:
      'CareerHeap focuses on practical recommendations tied to recruiter expectations and ATS parsing.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. You can cancel at any time from your account dashboard.'
  }
]

export const relatedTools: ToolSummary[] = [
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    description:
      'Generate tailored interview questions and answers based on any job description.',
    icon: 'interview',
    isActive: true
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    description:
      'Create a personalized cover letter in seconds. Just paste the job listing.',
    icon: 'cover',
    isActive: true
  },
  {
    slug: 'job-match-score',
    title: 'Job Match Score',
    description:
      'See how well your profile matches a job posting and what to improve.',
    icon: 'job',
    isActive: false
  }
]

export interface BlogPostSection {
  heading: string
  body: string
}

export interface BlogPostTemplate {
  slug: string
  category: string
  title: string
  author: string
  date: string
  readTime: string
  intro: string
  sections: BlogPostSection[]
}

export const blogPostTemplates: BlogPostTemplate[] = [
  {
    slug: 'resume-mistakes-cost-interviews',
    category: 'Career Tips',
    title: '10 Resume Mistakes That Cost You Interviews',
    author: 'Sarah Chen',
    date: 'Feb 12, 2026',
    readTime: '5 min read',
    intro:
      'Your resume is the first impression you make on a hiring manager. Most candidates repeat the same avoidable mistakes that lead to quick rejection.',
    sections: [
      {
        heading: '1. Writing a Generic Objective Statement',
        body: 'Replace generic objectives with a targeted summary that speaks directly to the role you want.'
      },
      {
        heading: '2. Listing Duties Instead of Achievements',
        body: 'Show measurable outcomes with action verb + task + result framing.'
      },
      {
        heading: '3. Ignoring ATS Formatting',
        body: 'Keep formatting simple and keyword-rich so ATS systems can parse your resume accurately.'
      },
      {
        heading: '4. Making Your Resume Too Long',
        body: 'For most candidates, one page is enough. Focus on relevance and impact.'
      },
      {
        heading: '5. Forgetting to Proofread',
        body: 'Typos are credibility killers. Review multiple times and use a second set of eyes.'
      }
    ]
  },
  {
    slug: 'tell-me-about-yourself-2026',
    category: 'Interviews',
    title: "How to Answer 'Tell Me About Yourself' in 2026",
    author: 'Ava Morales',
    date: 'Feb 8, 2026',
    readTime: '7 min read',
    intro:
      'The strongest interview opener is concise, role-focused, and confident. Use a short past-present-future structure.',
    sections: [
      {
        heading: 'Lead with your current role',
        body: 'Start with your current scope and strengths in one sentence.'
      },
      {
        heading: 'Bridge to measurable wins',
        body: 'Include one or two outcomes with metrics to show impact.'
      },
      {
        heading: 'Tie directly to the role',
        body: 'Close by connecting your experience to what this role needs today.'
      }
    ]
  },
  {
    slug: 'ai-cover-letters-work',
    category: 'Tools',
    title: 'AI Cover Letters: Do They Actually Work?',
    author: 'Jordan Patel',
    date: 'Feb 3, 2026',
    readTime: '4 min read',
    intro:
      'AI can speed up drafting, but quality depends on your inputs and editing process. Treat AI output as a structured first draft.',
    sections: [
      {
        heading: 'Use the exact job description',
        body: 'Prompt with role requirements and include your strongest relevant experience.'
      },
      {
        heading: 'Rewrite generic language',
        body: 'Replace vague claims with specific examples and quantified impact.'
      },
      {
        heading: 'Personalize the final version',
        body: 'Add company-specific context before submitting.'
      }
    ]
  }
]

export const blogPostBySlug = new Map(blogPostTemplates.map((post) => [post.slug, post]))
