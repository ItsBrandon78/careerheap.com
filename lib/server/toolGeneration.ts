/* ============================================================
   CareerHeap — companion tool generation (real AI)
   Résumé Analyzer · Interview Prep · Cover Letter.
   Uses the same OpenAI fetch pattern as the planner LLM helpers
   (lib/server/*Llm.ts) and degrades gracefully to a deterministic
   fallback when OPENAI_API_KEY is not configured.
   ============================================================ */

const MODEL_DEFAULT = 'gpt-4.1-mini'

export type ResumeAnalysis = {
  score: number
  band: string
  summary: string
  keywords: { matched: string[]; missing: string[] }
  findings: Array<{ type: 'good' | 'improve'; title: string; detail: string }>
  rewrites: Array<{ before: string; after: string }>
}

export type InterviewPrep = {
  role: string
  questions: Array<{ q: string; a: string; tip: string }>
}

export type CoverLetter = {
  opening: string
  body: string
  closing: string
}

export type ToolLocale = 'en' | 'fr'

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

function localeNote(locale: ToolLocale | undefined) {
  return locale === 'fr' ? ' Write all output in natural Canadian French (français canadien).' : ''
}

async function callOpenAIJson<T>(args: {
  system: string
  user: unknown
  schemaName: string
  schema: Record<string, unknown>
  temperature?: number
}): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  const model = process.env.OPENAI_TOOLS_MODEL?.trim() || MODEL_DEFAULT

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: args.temperature ?? 0.4,
        messages: [
          { role: 'system', content: args.system },
          {
            role: 'user',
            content: typeof args.user === 'string' ? args.user : JSON.stringify(args.user)
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: args.schemaName, strict: true, schema: args.schema }
        }
      }),
      signal: AbortSignal.timeout(30_000)
    })

    if (!response.ok) return null
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') return null
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

/* ---------- Résumé Analyzer ---------- */

const RESUME_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    band: { type: 'string' },
    summary: { type: 'string' },
    keywords: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'array', maxItems: 12, items: { type: 'string' } },
        missing: { type: 'array', maxItems: 10, items: { type: 'string' } }
      },
      required: ['matched', 'missing']
    },
    findings: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['good', 'improve'] },
          title: { type: 'string' },
          detail: { type: 'string' }
        },
        required: ['type', 'title', 'detail']
      }
    },
    rewrites: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { before: { type: 'string' }, after: { type: 'string' } },
        required: ['before', 'after']
      }
    }
  },
  required: ['score', 'band', 'summary', 'keywords', 'findings', 'rewrites']
}

function bandForScore(score: number) {
  if (score >= 85) return 'Strong — recruiter-ready'
  if (score >= 70) return 'Solid — a few fixes away'
  if (score >= 50) return 'Promising — needs sharpening'
  return 'Early — let’s build it up'
}

function resumeFallback(resumeText: string, targetRole: string): ResumeAnalysis {
  const text = resumeText.toLowerCase()
  const hasNumbers = /\d/.test(resumeText)
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length
  let score = 48
  if (hasNumbers) score += 14
  if (wordCount > 120) score += 12
  if (/\b(led|built|shipped|owned|improved|reduced|grew)\b/.test(text)) score += 14
  score = Math.min(92, score)
  const common = ['communication', 'teamwork', 'excel', 'sql', 'customer', 'project']
  const matched = common.filter((k) => text.includes(k)).map((k) => k[0].toUpperCase() + k.slice(1))
  const missing = ['Quantified impact', 'Action verbs', 'Role keywords', 'Professional summary'].slice(
    0,
    hasNumbers ? 3 : 4
  )
  return {
    score,
    band: bandForScore(score),
    summary: `Your résumé is a reasonable starting point for ${targetRole || 'your target role'}. The biggest wins are leading with measurable outcomes and mirroring the language of the roles you want.`,
    keywords: { matched: matched.length ? matched : ['Customer service'], missing },
    findings: [
      {
        type: hasNumbers ? 'good' : 'improve',
        title: hasNumbers ? 'You use some numbers' : 'Add measurable outcomes',
        detail: hasNumbers
          ? 'Quantified lines stand out to recruiters — keep doing this across every role.'
          : 'Turn duties into results: add team sizes, $ amounts, %, and time saved.'
      },
      {
        type: 'improve',
        title: 'Lead bullets with strong verbs',
        detail: 'Start each line with a verb (Built, Led, Reduced) and end with the outcome.'
      },
      {
        type: 'improve',
        title: 'Mirror the job posting',
        detail: `Add the exact terms a ${targetRole || 'target role'} posting uses so you pass keyword filters.`
      }
    ],
    rewrites: [
      {
        before: 'Responsible for handling customer transactions and resolving issues.',
        after:
          'Resolved 30+ customer issues per shift at a 96% satisfaction rate while handling $4k+ in daily transactions.'
      }
    ]
  }
}

export async function generateResumeAnalysis(input: {
  resumeText: string
  targetRole?: string
  locale?: ToolLocale
}): Promise<{ result: ResumeAnalysis; source: 'ai' | 'fallback' }> {
  const targetRole = (input.targetRole || '').trim()
  if (isConfigured()) {
    const ai = await callOpenAIJson<ResumeAnalysis>({
      system:
        'You are an expert technical recruiter and résumé coach. Analyze the résumé honestly and specifically. Do not invent experience the candidate does not have. Score 0-100 on impact, clarity, and keyword fit. Provide concrete findings and exact line rewrites grounded in the résumé text.' +
        localeNote(input.locale),
      user: {
        task: 'Analyze this résumé.',
        target_role: targetRole || 'general / unspecified',
        resume_text: input.resumeText.slice(0, 8000),
        guidance: [
          'matched = real keywords already present; missing = high-value keywords to add for the target role.',
          'findings: 3-5 items, mix of good and improve, specific to this résumé.',
          'rewrites: 2-4 real before/after lines taken from the résumé where possible.'
        ]
      },
      schemaName: 'resume_analysis',
      schema: RESUME_SCHEMA,
      temperature: 0.3
    })
    if (ai) {
      return { result: { ...ai, band: ai.band || bandForScore(ai.score) }, source: 'ai' }
    }
  }
  return { result: resumeFallback(input.resumeText, targetRole), source: 'fallback' }
}

/* ---------- Interview Prep ---------- */

const INTERVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    role: { type: 'string' },
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          q: { type: 'string' },
          a: { type: 'string' },
          tip: { type: 'string' }
        },
        required: ['q', 'a', 'tip']
      }
    }
  },
  required: ['role', 'questions']
}

function interviewFallback(role: string): InterviewPrep {
  return {
    role,
    questions: [
      {
        q: `Why do you want to move into a ${role} role?`,
        a: `Lead with a genuine reason tied to the work, then back it with proof: a project, a course, or a moment that confirmed the direction. Keep it about the role, not just leaving your old one.`,
        tip: 'Name one concrete thing you did to prepare — it turns motivation into evidence.'
      },
      {
        q: 'Tell me about yourself.',
        a: 'Give a 60-second arc: where you are now, the bridge you’re building, and why this role is the natural next step. End on what you can contribute, not your life story.',
        tip: 'Practice it out loud until it’s 45–60 seconds — rambling here costs you.'
      },
      {
        q: 'Describe a time you solved a difficult problem.',
        a: 'Use STAR: Situation, Task, Action, Result. Pick a story with a measurable outcome, even from a different field — transferable problem-solving is what they’re testing.',
        tip: 'End with the number: the % saved, the issue fixed, the deadline met.'
      },
      {
        q: 'What’s your biggest weakness?',
        a: 'Name a real, non-fatal weakness and the concrete system you use to manage it. Avoid clichés like “I work too hard.”',
        tip: 'Show the fix, not just the flaw — that’s what they’re actually scoring.'
      },
      {
        q: `Why should we hire you for this ${role} role over someone with more experience?`,
        a: 'Reframe newness as hunger plus proof-of-work. Point to a portfolio piece or project that shows you can already do part of the job.',
        tip: 'Have one undeniable example ready — a thing you built or shipped.'
      }
    ]
  }
}

export async function generateInterviewPrep(input: {
  role: string
  context?: string
  locale?: ToolLocale
}): Promise<{ result: InterviewPrep; source: 'ai' | 'fallback' }> {
  const role = input.role.trim()
  if (isConfigured()) {
    const ai = await callOpenAIJson<InterviewPrep>({
      system:
        'You are an interview coach for career switchers and early-career candidates. Produce realistic questions for the target role with strong, honest model answers and a sharp practical tip for each. Do not invent the candidate’s background.' +
        localeNote(input.locale),
      user: {
        task: 'Generate an interview question set for this role.',
        role,
        extra_context: (input.context || '').slice(0, 2000),
        guidance: [
          '5-7 questions: a mix of behavioral, role-specific, and the classic openers.',
          'Answers should be 2-4 sentences and coach the candidate on structure (e.g. STAR).',
          'Each tip is one actionable sentence.'
        ]
      },
      schemaName: 'interview_prep',
      schema: INTERVIEW_SCHEMA,
      temperature: 0.5
    })
    if (ai && Array.isArray(ai.questions) && ai.questions.length > 0) {
      return { result: { role: ai.role || role, questions: ai.questions }, source: 'ai' }
    }
  }
  return { result: interviewFallback(role), source: 'fallback' }
}

/* ---------- Cover Letter ---------- */

const COVER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    opening: { type: 'string' },
    body: { type: 'string' },
    closing: { type: 'string' }
  },
  required: ['opening', 'body', 'closing']
}

function coverFallback(role: string, company: string): CoverLetter {
  return {
    opening: `Dear Hiring Team${company ? ' at ' + company : ''},\n\nWhen I read that you value clear thinking and real proof of work over years on paper, I knew I had to apply for the ${role || 'role'}. I'm early in this path, but I've already turned messy, real-world problems into results a team could act on — exactly the work you're describing.`,
    body: `In my recent experience I handled high-volume, detail-heavy work under deadline pressure and owned outcomes end to end — proof I'm comfortable with the people, the numbers, and the follow-through. Since deciding to move into this field I've been deliberately building the specific skills the posting asks for, and I can show the work, not just describe it.\n\nWhat draws me to your team is the chance to keep learning from people who ship real decisions. I'd welcome the chance to walk you through a project behind this letter.`,
    closing: `Thank you for considering an application from someone making a deliberate, well-prepared switch. I'd love the chance to talk.\n\nWarmly,\nYour name`
  }
}

export async function generateCoverLetter(input: {
  role: string
  company?: string
  jobPosting: string
  background?: string
  locale?: ToolLocale
}): Promise<{ result: CoverLetter; source: 'ai' | 'fallback' }> {
  const role = input.role.trim()
  const company = (input.company || '').trim()
  if (isConfigured()) {
    const ai = await callOpenAIJson<CoverLetter>({
      system:
        'You write focused, sincere cover letters for career switchers and early-career candidates. No clichés, no filler, no invented achievements. Ground every claim in the candidate background provided; where background is thin, write honestly about motivation and transferable strengths. Return three parts: opening (hook + why this role), body (1-2 paragraphs of proof + fit), closing (thanks + call to talk).' +
        localeNote(input.locale),
      user: {
        task: 'Draft a cover letter.',
        role: role || 'the role',
        company: company || null,
        job_posting: input.jobPosting.slice(0, 4000),
        candidate_background: (input.background || '').slice(0, 2000) || 'Not provided — write from motivation and transferable strengths.'
      },
      schemaName: 'cover_letter',
      schema: COVER_SCHEMA,
      temperature: 0.6
    })
    if (ai && ai.opening && ai.body) {
      return { result: ai, source: 'ai' }
    }
  }
  return { result: coverFallback(role, company), source: 'fallback' }
}
