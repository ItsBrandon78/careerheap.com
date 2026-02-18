'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import { useAuth } from '@/lib/auth/context'

interface CheckoutProduct {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  description: string
  features: string[]
  savings?: string
}

const products: CheckoutProduct[] = [
  {
    id: 'price_monthly',
    name: 'Monthly Pro',
    price: 19,
    interval: 'month',
    description: 'Best for individuals getting started.',
    features: [
      'Unlimited resume analysis',
      'Unlimited cover letter generation',
      'Unlimited interview prep',
      'Priority support',
      'Ad-free experience'
    ]
  },
  {
    id: 'price_annual',
    name: 'Annual Pro',
    price: 180,
    interval: 'year',
    description: 'Best value for serious job seekers.',
    features: [
      'Unlimited resume analysis',
      'Unlimited cover letter generation',
      'Unlimited interview prep',
      'Priority support',
      'Ad-free experience'
    ],
    savings: 'Save $48/year'
  }
]

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, isPro } = useAuth()
  const router = useRouter()

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email: user.email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Checkout failed')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-[560px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
          <h1 className="text-3xl font-bold text-text-primary">Sign In Required</h1>
          <p className="mt-3 text-text-secondary">You need to sign in before starting checkout.</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="primary">Sign In</Button>
          </Link>
        </div>
      </section>
    )
  }

  if (isPro) {
    return (
      <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-[560px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
          <h1 className="text-3xl font-bold text-text-primary">You are already Pro</h1>
          <p className="mt-3 text-text-secondary">Your account already has unlimited access.</p>
          <Link href="/tools" className="mt-6 inline-block">
            <Button variant="primary">Go to Tools</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-bg-secondary px-4 py-16 lg:px-[170px]">
      <div className="mx-auto max-w-content">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[1.5px] text-accent">CHECKOUT</p>
          <h1 className="mt-3 text-[40px] font-bold text-text-primary">Upgrade to Pro</h1>
          <p className="mx-auto mt-3 max-w-[560px] text-lg text-text-secondary">
            Choose your plan and unlock every CareerHeap tool.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-8 max-w-[760px] rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mx-auto mt-10 grid max-w-[860px] gap-6 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="rounded-lg border border-border bg-surface p-8 shadow-card">
              <h2 className="text-2xl font-bold text-text-primary">{product.name}</h2>
              <p className="mt-2 text-sm text-text-secondary">{product.description}</p>

              <div className="mt-6">
                <span className="text-5xl font-bold text-text-primary">${product.price}</span>
                <span className="ml-1 text-sm text-text-secondary">/{product.interval}</span>
                {product.savings && <p className="mt-2 text-sm font-semibold text-success">{product.savings}</p>}
              </div>

              <Button
                variant="primary"
                className="mt-8 w-full"
                onClick={() => handleCheckout(product.id)}
                isLoading={isLoading}
                disabled={isLoading}
              >
                Continue to Secure Checkout
              </Button>

              <ul className="mt-8 space-y-3">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="mt-1 h-2 w-2 rounded-full bg-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/tools">
            <Button variant="outline">Try Free Tools First</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}