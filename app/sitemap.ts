import type { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/sanity/api'
import { getSiteBaseUrl } from '@/lib/blog/utils'

export const revalidate = 300

const coreRoutes = [
  '',
  '/blog',
  '/pricing',
  '/tools',
  '/tools/career-switch-planner',
  '/about',
  '/contact',
  '/careers',
  '/privacy',
  '/terms'
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl()
  const now = new Date()
  const posts = await getAllBlogPosts()

  const core = coreRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/blog' ? 'hourly' : 'weekly',
    priority: route === '' ? 1 : route === '/blog' ? 0.9 : 0.7
  })) satisfies MetadataRoute.Sitemap

  const blogEntries = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.8
  })) satisfies MetadataRoute.Sitemap

  return [...core, ...blogEntries]
}
