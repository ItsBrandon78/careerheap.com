export const sanityProjectId = process.env.SANITY_PROJECT_ID || ''
export const sanityDataset = process.env.SANITY_DATASET || ''
export const sanityApiVersion = process.env.SANITY_API_VERSION || '2026-02-18'

export const isSanityConfigured =
  sanityProjectId.length > 0 && sanityDataset.length > 0
