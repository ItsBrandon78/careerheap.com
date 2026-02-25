# CareerHeap Brand System

## Logo Exports

- Primary logo: `public/brand/careerheap-logo.svg`
- Monochrome logo: `public/brand/careerheap-logo-mono.svg`
- White logo: `public/brand/careerheap-logo-white.svg`
- Symbol only: `public/brand/careerheap-symbol.svg`

## Favicon / App Icon Exports

- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/apple-touch-icon.png` (180x180)
- `public/icon-512x512.png` (PWA icon)
- `public/manifest.webmanifest`

## Core Brand Tokens

- Primary brand color: `accent` (`#245DFF`)
- Secondary accent: `accent-secondary` (`#0EA5A4`)
- Neutral dark: `bg-dark` (`#0A1324`)
- Neutral mid: `text-secondary` (`#41516B`)
- Neutral light: `bg-primary` (`#F8FAFF`)
- Button primary: `accent`
- Button hover: `accent-hover`
- Border: `border`
- Focus ring: `focus-ring`

## Implementation Files

- Token source of truth: `src/design/tokens.ts`
- Tailwind mirror: `src/design/tokens.json`
- Global theme variables: `app/globals.css`
- Theme example file: `src/design/theme.css`
- Header implementation: `components/Header.tsx`
- Footer implementation: `components/Footer.tsx`
- Logo component: `components/BrandLogo.tsx`
- Button styles: `components/Button.tsx`
- Brand preview screens: `app/design-system/page.tsx`
- Icon generator script: `scripts/generate-brand-icons.mjs`

