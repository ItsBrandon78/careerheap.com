'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

interface CheckoutProduct {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
  savings?: string;
}

const products: CheckoutProduct[] = [
  {
    id: 'price_monthly',
    name: 'Monthly Pro',
    price: 19,
    interval: 'month',
    description: 'Best for individuals',
    features: [
      'Unlimited resume analysis',
      'Unlimited cover letter generation',
      'Unlimited interview prep',
      'Priority support',
      'Ad-free experience',
    ],
  },
  {
    id: 'price_annual',
    name: 'Annual Pro',
    price: 180,
    interval: 'year',
    description: 'Best value - Save 21%',
    features: [
      'Unlimited resume analysis',
      'Unlimited cover letter generation',
      'Unlimited interview prep',
      'Priority support',
      'Ad-free experience',
    ],
    savings: 'Save $48/year',
  },
];

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, isPro } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to upgrade to Pro.</p>
          <Link href="/login">
            <Button variant="primary">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Already a Pro Member</h1>
          <p className="text-gray-600 mb-6">You already have full access to all features.</p>
          <Link href="/tools">
            <Button variant="primary">Go to Tools</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Upgrade to Pro</h1>
          <p className="text-lg text-gray-600">Get unlimited access to all tools and features</p>
        </div>

        {error && (
          <div className="mb-8 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
              <p className="mt-2 text-gray-600">{product.description}</p>

              <div className="mt-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900">${product.price}</span>
                  <span className="ml-2 text-gray-600">
                    /{product.interval === 'month' ? 'month' : 'year'}
                  </span>
                </div>
                {product.savings && (
                  <p className="mt-2 text-sm font-semibold text-emerald-600">{product.savings}</p>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                className="mt-8 w-full"
                onClick={() => handleCheckout(product.id)}
                isLoading={isLoading}
                disabled={isLoading}
              >
                Get Started
              </Button>

              <ul className="mt-8 space-y-4">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                      ✓
                    </span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Not ready to upgrade?</p>
          <Link href="/tools">
            <Button variant="outline">Try Free Tools</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
