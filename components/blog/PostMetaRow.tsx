import { formatPublishedDate, toReadTimeLabel } from '@/lib/blog/utils'

interface PostMetaRowProps {
  authorName: string
  publishedAt: string
  readTimeMinutes: number
  compact?: boolean
}

export default function PostMetaRow({
  authorName,
  publishedAt,
  readTimeMinutes,
  compact = false
}: PostMetaRowProps) {
  const textSize = compact ? 'text-xs' : 'text-sm'
  const showAuthor = !compact && authorName.trim().length > 0

  return (
    <div className={`flex flex-wrap items-center gap-2 ${textSize} text-text-tertiary`}>
      {showAuthor ? (
        <>
          <span className="font-medium text-text-secondary">{authorName}</span>
          <span aria-hidden="true">&bull;</span>
        </>
      ) : null}
      <time dateTime={publishedAt}>{formatPublishedDate(publishedAt)}</time>
      <span aria-hidden="true">&bull;</span>
      <span>{toReadTimeLabel(readTimeMinutes)}</span>
    </div>
  )
}

