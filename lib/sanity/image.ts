import imageUrlBuilder from '@sanity/image-url'
import {
  isSanityConfigured,
  sanityDataset,
  sanityProjectId
} from '@/lib/sanity/env'

const builder = isSanityConfigured
  ? imageUrlBuilder({
      projectId: sanityProjectId,
      dataset: sanityDataset
    })
  : null

export function getSanityImageUrl(source: unknown) {
  if (!builder || !source) {
    return null
  }

  return builder.image(source as never)
}
