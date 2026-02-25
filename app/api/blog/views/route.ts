import { NextResponse } from 'next/server'
import { incrementBlogPostView } from '@/lib/server/blogViews'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    await incrementBlogPostView(slug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Blog view tracking failed:', error)
    return NextResponse.json({ error: 'Unable to track view' }, { status: 500 })
  }
}
