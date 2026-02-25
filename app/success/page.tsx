import { Suspense } from 'react'
import SuccessClient from './SuccessClient'

function SuccessFallback() {
  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[600px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
        <h1 className="text-3xl font-bold text-text-primary">Purchase Complete</h1>
        <p className="mt-3 text-text-secondary">Loading checkout confirmation...</p>
      </div>
    </section>
  )
}

export default function SuccessPage() {
  // Next.js requires a Suspense boundary when reading search params in a client child.
  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessClient />
    </Suspense>
  )
}
