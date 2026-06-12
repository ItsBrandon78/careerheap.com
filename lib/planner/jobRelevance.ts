import { normalizeBulletKey } from '@/lib/transition/dedupe'

// Seniority / qualifier words that should never, on their own, make a posting
// "relevant" — otherwise "Apprentice Plumber" matches "Apprentice Electrician".
const GENERIC_ROLE_TOKENS = new Set([
  'apprentice', 'junior', 'senior', 'assistant', 'trainee', 'entry', 'level',
  'intern', 'internship', 'jr', 'sr', 'lead', 'head', 'staff', 'full', 'part',
  'time', 'temporary', 'permanent', 'contract', 'casual', 'i', 'ii', 'iii'
])

const PREFIX_LEN = 5

function distinctiveTokens(value: string): string[] {
  return normalizeBulletKey(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_ROLE_TOKENS.has(token))
}

function tokenMatches(roleToken: string, titleToken: string): boolean {
  if (roleToken === titleToken) return true
  const n = Math.min(PREFIX_LEN, roleToken.length, titleToken.length)
  // Share a stem prefix (>= 5 chars) so "electrician" matches "electrical".
  return n >= PREFIX_LEN && roleToken.slice(0, n) === titleToken.slice(0, n)
}

function titleMatchesRole(jobTitle: string, role: string): boolean {
  const roleTokens = distinctiveTokens(role)
  // No distinctive tokens to judge against (e.g. "Senior") — don't over-filter.
  if (roleTokens.length === 0) return true
  const titleTokens = normalizeBulletKey(jobTitle)
    .split(' ')
    .filter((token) => token.length >= 3)
  return roleTokens.some((rt) => titleTokens.some((tt) => tokenMatches(rt, tt)))
}

/**
 * A posting is relevant when its title plausibly matches at least one of the
 * searched roles (target + bridge roles). Drops loose Adzuna keyword matches
 * like "Technician" surfacing for an "Apprentice Electrician" search.
 */
export function isRelevantJobTitle(jobTitle: string, roleQueries: string[]): boolean {
  if (!jobTitle.trim()) return false
  return roleQueries.some((role) => titleMatchesRole(jobTitle, role))
}
