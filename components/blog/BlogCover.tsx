import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'

/**
 * Branded gradient blog cover, ported from the prototype (Pages.jsx BlogCover).
 * Uses a real Sanity cover image when present, otherwise a category-themed
 * gradient with a faded corner glyph + centered label.
 */
const COVER_THEME: Record<string, { icon: string; from: string; to: string }> = {
  'Getting Started': { icon: 'rocket', from: '#245dff', to: '#0ea5a4' },
  'Career Tips': { icon: 'award', from: '#1e4ed9', to: '#245dff' },
  Interviews: { icon: 'message', from: '#0ea5a4', to: '#1e4ed9' },
  Tools: { icon: 'layers', from: '#3b4fb0', to: '#0ea5a4' }
}

export default function BlogCover({
  category,
  height = 200,
  imageUrl = null,
  imageAlt,
  showLabel = true
}: {
  category: string
  height?: number
  imageUrl?: string | null
  /** Pass a meaningful alt for standalone covers (e.g. the article hero). Omit
   *  for covers inside a linking card, which stay decorative to avoid duplicate
   *  announcements. */
  imageAlt?: string
  showLabel?: boolean
}) {
  const theme = COVER_THEME[category] ?? COVER_THEME.Tools
  const iconSize = Math.min(Math.round(height * 0.95), 188)
  const labelSize = height > 180 ? 13 : 11.5

  if (imageUrl) {
    const decorative = !imageAlt
    return (
      <div className="relative w-full overflow-hidden bg-bg-dark" style={{ height }}>
        <Image
          src={imageUrl}
          alt={imageAlt ?? ''}
          fill
          aria-hidden={decorative ? 'true' : undefined}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 560px"
        />
        {showLabel && (
          <>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(10,19,36,0.55))' }} />
            <span
              className="absolute bottom-3.5 left-4 font-bold uppercase tracking-[1.4px] text-white"
              style={{ fontSize: labelSize, opacity: 0.95 }}
            >
              {category}
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative grid w-full place-items-center overflow-hidden bg-bg-dark" style={{ height }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 78% 12%, ${theme.from}, transparent 58%), radial-gradient(circle at 8% 104%, ${theme.to}, transparent 52%)`
        }}
      />
      <div className="absolute" style={{ right: -14, bottom: -18, color: 'rgba(255,255,255,0.16)' }}>
        <Icon name={theme.icon} size={iconSize} stroke={1.5} />
      </div>
      {showLabel && (
        <span
          className="relative font-bold uppercase tracking-[1.4px] text-white"
          style={{ fontSize: labelSize, opacity: 0.92 }}
        >
          {category}
        </span>
      )}
    </div>
  )
}
