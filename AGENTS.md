Mockup parity checklist
=======================

Source of truth
- The parity target comes from `careerheap/CareerHeap,pen.pen` top-level frames:
  - `Homepage`
  - `Tool Page - Active State`
  - `Tool Page - Locked State`
  - `Pricing Page`
  - `Blog Post Template`
  - `- Design System Components -`

Design tokens
- Canonical token file: `src/design/tokens.ts`
- Tailwind runtime mirror: `src/design/tokens.json` (consumed by `tailwind.config.js`)
- Required token groups:
  - `colors`: accent/navy surfaces, text hierarchy, borders, status colors
  - `spacing`: `xs, sm, md, lg, xl, 2xl, 3xl, section`
  - `radius`: `sm, md, lg, pill`
  - `shadows`: `button, card, panel`
  - `container`: `content=1100`, `wide=1280`, `tool=760`
  - `breakpoints`: `sm, md, lg, xl`

Global spacing/layout rules
- Section rhythm: `py-section` (`96px`) for major sections, `py-16` for secondary sections.
- Horizontal gutters:
  - Mobile: `px-4`
  - Desktop frame parity: `lg:px-[170px]` for content sections, `lg:px-[340px]` for narrow tool/pricing blocks.
- Max widths:
  - Main content: `max-w-content`
  - Footer/header shell: `max-w-wide`
  - Tool/pricing body: `max-w-tool`

Typography rules
- Body + headings use Inter (`font-body`, `font-heading`).
- Hero/page title sizes:
  - Marketing hero: `48px` desktop (`42px` mobile)
  - Page headers: `40px`
  - Section headers: `32px` or `24px` depending on frame density
- Secondary body text uses `text-text-secondary`; metadata uses `text-text-tertiary`.

Component reuse contract
- Reuse these components for parity pages and avoid one-off card/button implementations:
  - `Header`
  - `Footer`
  - `Button` (`primary`, `secondary`, `ghost`, `outline`)
  - `Badge`
  - `Card`
  - `ToolCard`
  - `BlogCard`
  - `PricingCard`
  - `FAQAccordion`
  - `ToolHero`
  - `ToolUIContainer`
  - `PaywallBanner`

Route composition contract
- Required parity routes must be composed from shared components:
  - `/`
  - `/pricing`
  - `/blog/[slug]`
  - `/tools/[slug]`
- Tool locked preview requirement:
  - Query param: `/tools/[slug]?locked=1`
  - Component API: `ToolPageTemplate({ locked: true })`

Regression guardrails
- Do not introduce raw hex color classes in route/component files; use token-mapped classes.
- Do not bypass shared components for cards/buttons/badges in parity routes.
- Keep Tailwind token mapping in sync when token values change.
- Validate desktop + mobile spacing and max-width behavior after layout changes.

Implementation status (roadmap/dev)
- [x] `src/design/tokens.ts` is the canonical design-token source.
- [x] Tailwind token mapping is wired through `tailwind.config.js`.
- [x] Shared parity components are implemented and reused (`Header`, `Footer`, `Button`, `Badge`, `Card`, `ToolCard`, `BlogCard`, `PricingCard`, `FAQAccordion`, `ToolHero`, `ToolUIContainer`, `PaywallBanner`).
- [x] Core parity pages are implemented:
  - [x] `/`
  - [x] `/pricing`
  - [x] `/blog/[slug]`
  - [x] `/tools/[slug]`
- [x] Locked tool preview flows are implemented:
  - [x] `/tools/[slug]?locked=1`
  - [x] `/tools/[slug]/locked`
- [x] Design system preview page is implemented: `/design-system`.
