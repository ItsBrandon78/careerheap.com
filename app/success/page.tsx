import Link from 'next/link'
import Button from '@/components/Button'

export default function SuccessPage() {
  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[600px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-2xl text-success">
          ?
        </div>
        <h1 className="mt-5 text-3xl font-bold text-text-primary">Welcome to Pro</h1>
        <p className="mt-3 text-text-secondary">
          Your subscription is active. You now have unlimited access to all CareerHeap tools.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/tools" className="block">
            <Button variant="primary" className="w-full">
              Start Using Tools
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mt-8 rounded-md border border-accent/20 bg-accent-light p-4 text-left">
          <p className="text-sm text-text-secondary">
            Tip: manage your subscription at any time from your account settings.
          </p>
        </div>
      </div>
    </section>
  )
}