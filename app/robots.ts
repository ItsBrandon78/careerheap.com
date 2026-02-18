import type { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/blog/utils'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/studio', '/studio/']
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  }
}
