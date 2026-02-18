import { createClient } from 'next-sanity'
import {
  isSanityConfigured,
  sanityApiVersion,
  sanityDataset,
  sanityProjectId
} from '@/lib/sanity/env'

export const sanityClient = isSanityConfigured
  ? createClient({
      projectId: sanityProjectId,
      dataset: sanityDataset,
      apiVersion: sanityApiVersion,
      perspective: 'published',
      useCdn: true
    })
  : null

interface SanityFetchOptions<QueryParams extends Record<string, unknown>> {
  query: string
  params?: QueryParams
  revalidate?: number
  tags?: string[]
}

export async function sanityFetch<
  QueryResponse,
  QueryParams extends Record<string, unknown> = Record<string, never>
>({
  query,
  params,
  revalidate = 120,
  tags = ['blog']
}: SanityFetchOptions<QueryParams>): Promise<QueryResponse> {
  if (!sanityClient) {
    throw new Error('Sanity is not configured')
  }

  return sanityClient.fetch<QueryResponse>(query, params ?? ({} as QueryParams), {
    next: {
      revalidate,
      tags
    }
  })
}
