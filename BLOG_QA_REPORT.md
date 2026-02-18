# Blog QA Report (Sanity Integration)

Date: 2026-02-18

## Scope Covered

- `/blog`
- `/blog/[slug]`
- Sanity schemas + query/data layer
- SEO/indexing fundamentals
- ISR behavior
- UX states (loading/empty/error/not-found)
- Design-system consistency and mockup parity

## Issues Found and Fixed

1. Search was not debounced.
- Fix: Added 250ms debounce in `components/blog/BlogIndexClient.tsx`.

2. Sort logic lacked deterministic tie-breaking.
- Fix: Added stable sort tie-breakers by publish date and slug in `components/blog/BlogIndexClient.tsx`.

3. Empty state lacked funnel CTA.
- Fix: Added Career Switch Planner link in empty state (`components/blog/BlogIndexClient.tsx`).

4. Missing dedicated error states.
- Fix: Added `app/blog/error.tsx` and `app/blog/[slug]/error.tsx`.

5. Missing blog-specific not-found UX for unknown slugs.
- Fix: Added `app/blog/[slug]/not-found.tsx`.

6. SEO metadata missing fallback OG/Twitter coverage.
- Fix:
  - Added default OG image (`public/og-blog-default.svg`).
  - Added OG + Twitter metadata for `/blog` and `/blog/[slug]`.
  - Added fallback strategy (`seoTitle ?? title`, `seoDescription ?? excerpt`).

7. Canonical URL risked localhost.
- Fix: Added URL normalization in `lib/blog/utils.ts` to enforce production fallback (`https://careerheap.com`) when local hosts are detected.

8. Missing structured data for post pages.
- Fix: Added BlogPosting JSON-LD in `app/blog/[slug]/page.tsx`.

9. Missing indexing endpoints.
- Fix:
  - Added `app/sitemap.ts`
  - Added `app/robots.ts`
  - Added `app/rss.xml/route.ts`

10. Public data safety: token not needed in frontend reads.
- Fix: Removed `SANITY_READ_TOKEN` usage from public Sanity client (`lib/sanity/client.ts`, `lib/sanity/env.ts`).

11. Schema validation messages were generic/minimal.
- Fix: Added explicit, helpful validation messages in:
  - `sanity/schemas/post.ts`
  - `sanity/schemas/category.ts`
  - `sanity/schemas/author.ts`
  - `sanity/schemas/callout.ts`

12. Minor visual polish / parity improvements.
- Fixes:
  - Added planner CTA in blog hero (`components/blog/BlogHero.tsx`).
  - Added focus styling to search/filter controls.
  - Preserved design-token-based colors/radius/shadows.

## Published vs Draft Safety

- Queries explicitly exclude:
  - drafts (`!(_id in path("drafts.**"))`)
  - missing `publishedAt`
  - future publish dates (`publishedAt <= now()`)
- Post page returns `notFound()` for missing/unpublished slug.

## SEO/Indexing Verification

- Canonical present on `/blog` and `/blog/[slug]`.
- OpenGraph image present (cover image with fallback default image).
- Twitter card metadata present.
- JSON-LD BlogPosting present on post pages.
- `robots.txt`, `sitemap.xml`, and `rss.xml` routes implemented.

## ISR / Performance

- `/blog` revalidate: 120s
- `/blog/[slug]` revalidate: 120s
- `sitemap.xml`/`rss.xml` revalidate: 300s
- `/blog` fetches posts+categories concurrently via `Promise.all`.
- Next image remote patterns include Sanity CDN + Unsplash (`next.config.ts`).

## Documentation and Env Safety

- Updated `.env.local.example` with Sanity + site URL variables.
- Updated `README.md` with:
  - Sanity init/setup steps
  - Hosted Studio deployment workflow
  - Vercel env setup guidance
  - Secret handling note

## Validation Results

- `npm run lint`: PASS
- `npm run build`: PASS
- Runtime HTTP checks against active local instance:
  - `/blog`: 200
  - `robots.txt`: 200
  - `sitemap.xml`: 200
  - `rss.xml`: 200
  - Canonical/OG/Twitter tags present on `/blog`
- No server-side runtime errors observed in command output during QA checks.

## Open Notes

- "Popular" sort currently uses read-time as an MVP proxy; replace with analytics-backed popularity when available.
- In production, ensure Sanity dataset is publicly readable for published content, or implement secure server-side token strategy for private datasets.
