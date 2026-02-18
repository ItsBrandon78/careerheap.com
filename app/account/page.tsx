import { Suspense } from 'react'
import AccountClientPage from './AccountClient'

function AccountFallback() {
  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-border" />
        <div className="h-36 animate-pulse rounded-lg bg-border" />
        <div className="h-64 animate-pulse rounded-lg bg-border" />
      </div>
    </section>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountFallback />}>
      <AccountClientPage />
    </Suspense>
  )
}
