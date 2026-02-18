import type { BlogBodyBlock } from '@/lib/blog/types'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

export function formatPublishedDate(isoDate: string) {
  try {
    return dateFormatter.format(new Date(isoDate))
  } catch {
    return isoDate
  }
}

export function estimateReadTimeMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function portableTextToPlainText(blocks: BlogBodyBlock[] = []) {
  return blocks
    .map((block) => {
      if (
        block._type === 'callout' &&
        'title' in block &&
        'body' in block
      ) {
        return `${block.title} ${block.body}`
      }

      if (block._type !== 'block' || !Array.isArray(block.children)) {
        return ''
      }

      return block.children
        .map((child) => ('text' in child ? child.text : ''))
        .join('')
    })
    .filter(Boolean)
    .join(' ')
}

export function toReadTimeLabel(minutes: number) {
  return `${minutes} min read`
}

export function getDefaultOgImageUrl() {
  return `${getSiteBaseUrl()}/og-blog-default.svg`
}

function sanitizeBaseUrl(url: string) {
  const normalized = url.trim().replace(/\/+$/, '')
  if (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0')
  ) {
    return 'https://careerheap.com'
  }
  return normalized
}

export function getSiteBaseUrl() {
  return sanitizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://careerheap.com'
  )
}
