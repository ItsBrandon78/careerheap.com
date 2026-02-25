'use client'

import { useEffect, useRef } from 'react'

interface PostViewTrackerProps {
  slug: string
}

export default function PostViewTracker({ slug }: PostViewTrackerProps) {
  const hasSentRef = useRef(false)

  useEffect(() => {
    if (!slug || hasSentRef.current) {
      return
    }

    hasSentRef.current = true
    void fetch('/api/blog/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      keepalive: true
    }).catch(() => null)
  }, [slug])

  return null
}
