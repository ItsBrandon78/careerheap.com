import { createAdminClient } from '@/lib/supabase/admin'

interface BlogPostViewRow {
  post_slug: string
  view_count: number
}

function hasSupabaseServiceEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function incrementBlogPostView(slug: string) {
  if (!hasSupabaseServiceEnv()) {
    return
  }

  const trimmedSlug = slug.trim()
  if (!trimmedSlug) {
    return
  }

  const admin = createAdminClient()
  await admin.rpc('increment_blog_post_view', { p_post_slug: trimmedSlug })
}

export async function getBlogPopularityMap(days = 30) {
  if (!hasSupabaseServiceEnv()) {
    return {}
  }

  const admin = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - Math.max(days - 1, 0))
  const sinceDate = since.toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('blog_post_views_daily')
    .select('post_slug,view_count')
    .gte('view_date', sinceDate)

  if (error || !Array.isArray(data)) {
    return {}
  }

  const rows = data as BlogPostViewRow[]
  const aggregate: Record<string, number> = {}
  for (const row of rows) {
    if (!row.post_slug) continue
    const count = Number(row.view_count)
    if (!Number.isFinite(count) || count <= 0) continue
    aggregate[row.post_slug] = (aggregate[row.post_slug] ?? 0) + count
  }

  return aggregate
}
