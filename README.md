# CareerHeap App

CareerHeap is a Next.js application with a Sanity-backed public blog.

## Stack

- Next.js App Router
- Tailwind (token-mapped design system)
- Sanity Content Lake + Sanity Studio

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.local.example .env.local
```

3. Fill required env vars in `.env.local`:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION` (example: `2026-02-18`)
- `SANITY_READ_TOKEN` (optional; not needed for public published-content reads)
- `NEXT_PUBLIC_SITE_URL` (set to your production site, e.g. `https://careerheap.com`)
- Existing app keys (Supabase/Stripe) as needed

4. Create or connect a Sanity project/dataset (first-time setup):

```bash
npx sanity init
```

Choose/create your project and dataset, then mirror those values in `.env.local`.

5. Start Next.js:

```bash
npm run dev
```

6. Start Sanity Studio:

```bash
npm run studio
```

Sanity Studio runs on `http://localhost:3333` by default.

## Blog Routes

- `/blog` - blog index
- `/blog/[slug]` - blog post page

Both routes fetch only published Sanity content and use ISR revalidation.

## Sanity Content Model

Defined in `sanity/schemas`:

- `post`
- `category`
- `author`
- `callout` (for info/tip/warning blocks in article body)

## How to Publish a Blog Post

1. Open Studio (`npm run studio` or deployed studio URL).
2. Create/update `category` and `author` docs if needed.
3. Create a `post` doc:
   - title, slug, excerpt, cover image, category, body
   - set `publishedAt` (required for public visibility)
   - optional `seoTitle` and `seoDescription`
4. Publish.
5. Verify on `/blog` and `/blog/[slug]`.

## Hosted Studio Deployment (Recommended)

Deploy Studio separately:

```bash
npm run studio:deploy
```

This keeps browser authoring separate from the public web app.

## Vercel Notes

Set these vars in Vercel:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `SANITY_READ_TOKEN` (only if required for private datasets/previews)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`

Important:

- Canonical/OG URLs are normalized to production domain (`https://careerheap.com`) when local domains like `localhost` are detected.
- Never commit `.env.local` or secret tokens.

## Scripts

- `npm run dev` - run Next.js locally
- `npm run build` - production build
- `npm run start` - production server
- `npm run lint` - lint checks
- `npm run studio` - run Sanity Studio locally
- `npm run studio:deploy` - deploy hosted Studio
