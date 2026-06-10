'use client'

import { useEffect } from 'react'

// global-error replaces the root layout, so it must render its own <html>/<body>
// and cannot rely on app providers or Tailwind tokens. Keep it self-contained.
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#f6f7f9',
          color: '#0f172a'
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 16px',
            padding: 32,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(15,23,42,0.08)'
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#245dff', margin: 0 }}>
            SOMETHING WENT WRONG
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '12px 0 0' }}>We hit a snag</h1>
          <p style={{ color: '#475569', marginTop: 8 }}>
            The app ran into an unexpected error. Please try again — your account is safe.
          </p>
          {error?.digest ? (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>Reference: {error.digest}</p>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              background: '#245dff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
