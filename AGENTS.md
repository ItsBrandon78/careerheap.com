Mockup parity checklist
=======================

This file tracks the tokens and component mapping to preserve visual parity with the Pencil mockups.

- Tokens: src/design/tokens.json + src/design/tokens.ts
  - colors: `primary`, `primary-600`, `muted`, `bg-light`, `card`, `surface`, `navy`, `accent`
  - spacing: `xs, sm, md, lg, xl, container` (container=1120px)
  - radius: `sm, md, lg, pill`
  - shadows: `sm, md, lg`
  - breakpoints: `sm, md, lg, xl`

- Tailwind mapping: `tailwind.config.js` reads tokens.json and exposes `primary`, `muted`, `surface`, `card`, `navy`, `accent` etc.

- Components to reuse across pages:
  - `Header` / `Footer` — consistent container, spacing, token colors
  - `Button` — supports `primary`, `secondary`, `outline`, `ghost`; maps to `primary` token
  - `Badge` — small pill indicates uses / category
  - `Card` / `ToolUIContainer` — card background `card`, border `surface`
  - `ToolCard`, `BlogCard`, `PricingCard` — use token typography and spacing
  - `FAQAccordion` — uses `surface` borders and `muted` text for answers
  - `ToolHero`, `PaywallBanner`, `ToolUIContainer` — hero/section spacing uses container + tokens

- Spacing rules
  - Section vertical padding: `py-16` desktop, `py-12` tablet/mobile (`sm:py-24` where needed)
  - Content container: `container mx-auto px-4 sm:px-6 lg:px-8` (uses tokens.spacing.container)
  - Card padding: `p-6` / `p-8` depending on density

- Typography
  - Headings: use `text-navy` for strong headings
  - Body: `text-muted` for secondary copy

- Locked tool state
  - Render `PaywallBanner` with `usesRemaining <= 0` or query `?locked=1` for preview

Add regression guardrails:
- Use tokens for colors in components — search for direct color names (e.g., `text-gray-900`) and replace with token classes.
- Keep `src/design/tokens.json` as the single source of truth for token values.
