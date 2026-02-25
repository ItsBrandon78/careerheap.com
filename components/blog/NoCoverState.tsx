import { ToolGlyph } from '@/components/Icons'

interface NoCoverStateProps {
  title: string
  compact?: boolean
}

export default function NoCoverState({ title, compact = false }: NoCoverStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-bg-secondary px-4 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-border bg-surface text-text-tertiary">
        <ToolGlyph kind="resume" className="h-5 w-5" />
      </span>
      <p
        className={`max-w-[80%] font-semibold text-text-secondary ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-text-tertiary">No cover image available</p>
    </div>
  )
}
