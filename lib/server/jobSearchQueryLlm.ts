type QueryVariantResponse = {
  queries: string[]
}

const MAX_QUERY_VARIANTS = 5

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

function cleanVariant(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[,;:\-]+|[,;:\-]+$/g, '')
}

function uniqueVariants(values: string[], originalRole: string) {
  const seen = new Set<string>()
  const output: string[] = []

  for (const value of [originalRole, ...values]) {
    const cleaned = cleanVariant(value)
    if (cleaned.length < 3) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(cleaned)
    if (output.length >= MAX_QUERY_VARIANTS) break
  }

  return output
}

export async function suggestRoleSearchVariantsWithLlm(input: {
  role: string
  location: string
  country: string
}) {
  if (!isConfigured()) return []

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return []

  const model = process.env.OPENAI_JOB_QUERY_MODEL?.trim() || 'gpt-4.1-mini'
  const payload = {
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'You rewrite job search role titles into close, grounded search queries. Do not invent employers, locations, certifications, or unrelated roles.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Generate close job-title search variants for a role query.',
          hard_rules: [
            'Keep each query to a short role title only.',
            'Stay in the same occupation family.',
            'You may remove stage words, expand abbreviations, or provide close common-market equivalents.',
            'Do not add city, province, state, salary, seniority, employer names, or certifications.',
            `Return at most ${MAX_QUERY_VARIANTS} queries total, including the original phrasing if useful.`
          ],
          input: {
            role: input.role,
            location: input.location,
            country: input.country
          }
        })
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'job_query_variants',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            queries: {
              type: 'array',
              maxItems: MAX_QUERY_VARIANTS,
              items: {
                type: 'string'
              }
            }
          },
          required: ['queries']
        }
      }
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000)
    })

    if (!response.ok) return []

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') return []

    const parsed = JSON.parse(content) as QueryVariantResponse
    if (!parsed || !Array.isArray(parsed.queries)) return []

    return uniqueVariants(parsed.queries, input.role)
  } catch {
    return []
  }
}
