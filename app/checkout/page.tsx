import { Suspense } from 'react'
import CheckoutClientPage from './CheckoutClient'

function CheckoutFallback() {
  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[860px] space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-border" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-80 animate-pulse rounded-lg bg-border" />
          <div className="h-80 animate-pulse rounded-lg bg-border" />
        </div>
      </div>
    </section>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutClientPage />
    </Suspense>
  )
}
