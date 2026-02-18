import Link from 'next/link'
import Button from '@/components/Button'

export default function NotFound() {
  return (
    <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-[560px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">404</p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-2 text-text-secondary">
          The page you requested does not exist or was moved.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
