import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m11.5 5.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m10 3 1.6 3.4L15 8l-3.4 1.6L10 13l-1.6-3.4L5 8l3.4-1.6L10 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m15.5 12.5.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z" fill="currentColor" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ToolGlyph({
  kind,
  className
}: {
  kind:
    | 'resume'
    | 'interview'
    | 'cover'
    | 'job'
    | 'planner'
    | 'zap'
    | 'target'
    | 'shield'
    | 'book-open'
    | 'badge-check'
  className?: string
}) {
  if (kind === 'resume') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'interview') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="4" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="m8 14-1.5 3 3.5-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'cover') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M4 14.5 14.8 3.7a1.5 1.5 0 0 1 2.1 2.1L6.1 16.6 3 17l.4-3.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'job') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <rect x="3.5" y="5.5" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 5.5v-1a2 2 0 0 1 4 0v1M3.5 10h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'planner') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path
          d="M4 15.5h12M5.5 14V6.5h9V14M8 6.5V4.8a2 2 0 0 1 4 0v1.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 9.5h6M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'target') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
      </svg>
    )
  }
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M10 3.5 15.5 6v4.2c0 3-2.1 5.6-5.5 6.8-3.4-1.2-5.5-3.8-5.5-6.8V6L10 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'book-open') {
    return (
      <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
        <path
          d="M2.2 3.2h4.2c1.4 0 2.6.5 3.6 1.4v7.3c-1-.9-2.2-1.4-3.6-1.4H2.2V3.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.8 3.2H9.6c-1.4 0-2.6.5-3.6 1.4v7.3c1-.9 2.2-1.4 3.6-1.4h4.2V3.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'badge-check') {
    return (
      <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
        <path
          d="M8 2.3 9.5 3l1.6-.1.8 1.4 1.4.8-.1 1.6.7 1.5-.7 1.5.1 1.6-1.4.8-.8 1.4-1.6-.1-1.5.7-1.5-.7-1.6.1-.8-1.4-1.4-.8.1-1.6L1.7 8l.7-1.5-.1-1.6 1.4-.8.8-1.4L6.1 3 8 2.3Z"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m5.5 8.2 1.5 1.5 3.3-3.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return <SparklesIcon className={className} />
}
