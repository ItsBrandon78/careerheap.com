'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/Button'
import { useAuth } from '@/lib/auth/context'

interface CheckoutProduct {
  id: 'pro_monthly' | 'lifetime_one_time'
  name: string
  priceLabel: string
  description: string
  features: string[]
  highlighted?: boolean
}

const products: CheckoutProduct[] = [
  {
    id: 'pro_monthly',
    name: 'Pro',
    priceLabel: '$7/month',
    description: 'Unlimited reports, resume upload, and full roadmap output.',
    highlighted: true,
    features: [
      'Unlimited tool uses',
      'Resume upload (PDF/DOCX)',
      'Career switch roadmap',
      'Resume reframe generation'
    ]
  },
  {
    id: 'lifetime_one_time',
    name: 'Lifetime',
    priceLabel: '$49 one-time',
    description: 'Everything in Pro with no recurring billing.',
    features: ['Everything in Pro', 'No subscription', 'Early Supporter badge']
  }
]

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, plan } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan')

  const handleCheckout = async (productId: CheckoutProduct['id']) => {
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
        body: JSON.stringify({ productId, email: user.email })
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

  if (plan === 'pro' || plan === 'lifetime') {
    return (
      <section className="min-h-[calc(100vh-200px)] bg-bg-secondary px-4 py-16 lg:px-[170px]">
        <div className="mx-auto max-w-[560px] rounded-lg border border-border bg-surface p-8 text-center shadow-panel">
          <h1 className="text-3xl font-bold text-text-primary">Your plan is already active</h1>
          <p className="mt-3 text-text-secondary">
            {plan === 'pro'
              ? 'You are on Pro with unlimited access.'
              : 'You are on Lifetime with permanent unlimited access.'}
          </p>
          <Link href="/tools/career-switch-planner" className="mt-6 inline-block">
            <Button variant="primary">Open Career Switch Planner</Button>
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
          <h1 className="mt-3 text-[40px] font-bold text-text-primary">Choose Your Plan</h1>
          <p className="mx-auto mt-3 max-w-[560px] text-lg text-text-secondary">
            Unlock premium guidance with unlimited reports and resume upload.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-8 max-w-[760px] rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mx-auto mt-10 grid max-w-[860px] gap-6 md:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.id}
              className={`rounded-lg bg-surface p-8 shadow-card ${
                product.highlighted || initialPlan === 'lifetime' && product.id === 'lifetime_one_time'
                  ? 'border-2 border-accent'
                  : 'border border-border'
              }`}
            >
              {product.highlighted && <p className="text-sm font-semibold text-accent">Most Popular</p>}
              <h2 className="mt-1 text-2xl font-bold text-text-primary">{product.name}</h2>
              <p className="mt-2 text-sm text-text-secondary">{product.description}</p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-text-primary">{product.priceLabel}</span>
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
          <Link href="/tools/career-switch-planner">
            <Button variant="outline">Use Free Preview First</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
