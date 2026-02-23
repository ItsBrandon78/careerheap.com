# Blog QA Report (Sanity + Popular Sort)

Date: 2026-02-23

## Scope Covered

- `/blog`
- `/blog/[slug]`
- Sanity blog fetch/mapping layer
- Cover-image rendering parity
- Popular sort data pipeline
- SEO/indexing fundamentals

## Fixes Delivered

1. Unified cover image contract for list + detail pages.
- Implemented `coverImage: { url, width, height, alt } | null` in `lib/blog/types.ts`.
- Mapped from Sanity in `lib/sanity/api.ts`.

2. Removed random/placeholder cover-image fallback behavior.
- Deleted Unsplash fallback logic from `lib/sanity/api.ts`.
- Added deterministic no-cover UI (`components/blog/NoCoverState.tsx`).
- Applied on index cards, featured card, and post hero.

3. Added analytics-backed Popular sort.
- Added daily view aggregation table/function migration: `migrations/004_blog_post_views.sql`.
- Added view increment API: `app/api/blog/views/route.ts`.
- Added client tracker on post detail: `components/blog/PostViewTracker.tsx`.
- Blog index now sorts by real aggregated views from last 30 days (`app/blog/page.tsx`, `components/blog/BlogIndexClient.tsx`).

4. Kept draft/future safety rules intact.
- Queries still exclude drafts and future `publishedAt` entries.

## Validation Results

- `npm run lint`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `npm run lighthouse:local`: PASS

Lighthouse outputs:
- `lighthouse-home.json`: runtimeError `none`
- `lighthouse-tool.json`: runtimeError `none`
- `lighthouse-pricing.json`: runtimeError `none`
- `lighthouse-blog.json`: runtimeError `none`

## Open Notes

- Popular ranking quality improves as real view data accumulates.
- If Supabase service-role env vars are missing, view aggregation gracefully no-ops and Popular remains non-primary.
