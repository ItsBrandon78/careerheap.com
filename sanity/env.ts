export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ||
  process.env.SANITY_API_VERSION ||
  '2026-02-18'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
    process.env.SANITY_STUDIO_DATASET ||
    process.env.SANITY_DATASET,
  'Missing Sanity dataset env. Set one of: NEXT_PUBLIC_SANITY_DATASET, SANITY_STUDIO_DATASET, SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_STUDIO_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID,
  'Missing Sanity project id env. Set one of: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_STUDIO_PROJECT_ID, SANITY_PROJECT_ID'
)

function assertValue(v: string | undefined, errorMessage: string): string {
  if (!v) {
    throw new Error(errorMessage)
  }

  return v
}
