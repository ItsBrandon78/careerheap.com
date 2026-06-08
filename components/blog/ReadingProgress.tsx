'use client'

import { useEffect, useState } from 'react'

/** Fixed top reading-progress bar, ported from the prototype (Pages.jsx BlogPost). */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="print-hidden fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden="true">
      <div className="h-full bg-accent transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
    </div>
  )
}
