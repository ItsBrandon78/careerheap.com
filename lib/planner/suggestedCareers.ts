export interface SuggestedCareerCandidate {
  occupationId: string
  title: string
  score: number
  targetRoleSimilarity: number
}

// Minimum lexical similarity to the target role for a candidate to count as a
// genuine "role you can reach from here" in targeted mode. Mirrors the engine's
// own lexical-relevance floor (~0.08) with a little headroom.
const MIN_TARGET_SIMILARITY = 0.1

/**
 * Choose the "roles you can reach from here" list.
 *
 * Targeted mode (the user named a target): rank candidates by how related they
 * are to the TARGET occupation, not to the user's current profile — so a sous
 * chef aiming at apprentice electrician sees electrician-family roles, not
 * kitchen helpers. Discovery mode (no target): keep the current-profile order,
 * which is the right behaviour when the user is exploring.
 */
export function rankSuggestedCareers<T extends SuggestedCareerCandidate>(
  candidates: T[],
  options: {
    explicitTargetId: string | null
    hasExplicitTarget: boolean
    fallback: T[]
    limit?: number
  }
): T[] {
  const limit = options.limit ?? 6
  if (!options.hasExplicitTarget) {
    return options.fallback.slice(0, limit)
  }

  const adjacent = candidates
    .filter((candidate) => candidate.occupationId !== options.explicitTargetId)
    .filter((candidate) => candidate.targetRoleSimilarity >= MIN_TARGET_SIMILARITY)
    .sort(
      (a, b) =>
        b.targetRoleSimilarity - a.targetRoleSimilarity || b.score - a.score
    )
    .slice(0, limit)

  // Never invent: if nothing is genuinely target-adjacent, hand back the
  // provided fallback (the dashboard's domain filter drops any off-domain junk).
  return adjacent.length > 0 ? adjacent : options.fallback.slice(0, limit)
}
