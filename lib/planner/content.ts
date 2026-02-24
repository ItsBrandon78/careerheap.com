export const careerSwitchFaqs = [
  {
    question: 'How many free plans can I generate?',
    answer:
      'Free includes 1 full Career Map analysis. Upgrade for unlimited analyses, resume parsing, and full roadmap output.'
  },
  {
    question: 'Can I upload my resume instead of typing?',
    answer:
      'Resume upload is available on Pro and Lifetime. Free users can paste experience manually.'
  },
  {
    question: 'What does "Not sure" mode do?',
    answer:
      'Not sure mode suggests adjacent roles based on your background, then builds a practical roadmap.'
  },
  {
    question: 'Is my resume text stored?',
    answer:
      'CareerHeap stores only metadata needed for usage and billing. We do not persist your full resume text by default.'
  }
]

export const careerSwitchMoreTools = [
  {
    slug: 'resume-analyzer',
    title: 'Resume Analyzer',
    description: 'Get instant ATS-style feedback and rewrite suggestions for your resume.',
    icon: 'resume' as const,
    isActive: true
  },
  {
    slug: 'interview-prep',
    title: 'Interview Q&A Prep',
    description: 'Generate role-specific interview questions and polished answer frameworks.',
    icon: 'interview' as const,
    isActive: true
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Writer',
    description: 'Create tailored cover letters in seconds for each job you apply to.',
    icon: 'cover' as const,
    isActive: true
  }
]
