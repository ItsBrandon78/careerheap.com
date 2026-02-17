'use client';

import { useAuth } from '@/lib/auth/context';
import Button from '@/components/Button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  const { user, isPro, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="mt-1 font-mono text-sm text-gray-600">{user?.id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {isPro ? 'Pro' : 'Free'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          {!isPro && (
            <div className="rounded-lg bg-white p-6 shadow-sm border-2 border-sky-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upgrade to Pro</h2>
              <p className="text-gray-600 mb-6">
                Get unlimited access to all tools. Unlock resume analysis, cover letter
                generation, interview prep, and more.
              </p>
              <Link href="/pricing">
                <Button variant="primary">View Pricing</Button>
              </Link>
            </div>
          )}

          {/* Usage Card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tool Usage</h2>
            <p className="text-gray-600 mb-4">
              {isPro
                ? 'You have unlimited access to all tools.'
                : 'Free plan includes 3 uses per tool per month.'}
            </p>
            <Link href="/tools">
              <Button variant="outline">View Tools</Button>
            </Link>
          </div>

          {/* Sign Out Card */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session</h2>
            <p className="text-gray-600 mb-4">Sign out of your account</p>
            <button
              onClick={signOut}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
