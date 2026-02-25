# Blog Mockup Parity Checklist

Reference: `CareerHeap,pen.pen` frames for blog index/post desktop + mobile.

## `/blog` Desktop

- [x] Hero title and subtitle match mockup copy.
- [x] Hero uses CareerHeap spacing rhythm (`py-section`, centered max-width container).
- [x] Featured post appears first with larger image/card treatment.
- [x] Filter row includes search, category pills, sort control.
- [x] Post grid renders 3-up at large desktop (`xl`), 2-up at tablet (`md`), 1-up mobile.
- [x] Post cards include cover image, category pill, title, excerpt, meta row, and "Read more ->".
- [x] Card corner radius/shadows/borders use design-system tokens (`rounded-lg`, `shadow-card`, `border-border`).

## `/blog` Mobile

- [x] Hero scales down typography and keeps same hierarchy.
- [x] Featured card is single-column.
- [x] Filter controls stack vertically.
- [x] Post list is single-column with mobile spacing.

## `/blog/[slug]` Desktop

- [x] Above-the-fold includes category pill, H1, meta row, cover image.
- [x] Content typography hierarchy implemented (`H2`, `H3`, lists, quote styling).
- [x] Inline CTA is present near top of article body.
- [x] Sticky side CTA module exists on desktop (`lg:sticky`).
- [x] Related posts section uses 3-card grid.
- [x] End-of-post "Try the tools" section features Career Switch Planner first + pricing link.

## `/blog/[slug]` Mobile

- [x] Header/meta/cover collapse into mobile-friendly single column.
- [x] Content body remains readable with reduced font scale.
- [x] CTA module remains prominent and full-width.
- [x] Related posts stack vertically.
- [x] Tools funnel section remains present below related content.

## UX State Parity

- [x] Loading states added:
  - [x] `app/blog/loading.tsx`
  - [x] `app/blog/[slug]/loading.tsx`
- [x] Empty state on `/blog` includes clear-filters action and tool funnel link.
- [x] Error states added:
  - [x] `app/blog/error.tsx`
  - [x] `app/blog/[slug]/error.tsx`
- [x] Unknown slug has dedicated branded not-found state (`app/blog/[slug]/not-found.tsx`).

## Hover/Focus States

- [x] Blog cards have hover lift/shadow behavior via shared `Card` hover styles.
- [x] Search input has focus ring and border highlight.
- [x] Category filter pills have keyboard focus-visible ring.
- [x] Buttons use shared focus-visible ring styles.

## Noted Deviations

- Dynamic CMS content means exact post image/copy will differ from static mockup examples by design.
- Popular ranking reflects tracked real views and may be sparse until traffic data accumulates.
