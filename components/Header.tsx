'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import { useAuth } from '@/lib/auth/context';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-primary">CareerHeap</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/tools" className="text-muted hover:text-primary font-medium">
              Tools
            </Link>
            <Link href="/pricing" className="text-muted hover:text-primary font-medium">
              Pricing
            </Link>
            <Link href="/blog" className="text-muted hover:text-primary font-medium">
              Blog
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {!isLoading && user ? (
              <>
                <Link href="/account" className="text-muted hover:text-primary font-medium">
                  {user.email?.split('@')[0] || 'Account'}
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : !isLoading ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted hover:bg-surface"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            <Link href="/tools" className="block px-3 py-2 text-muted hover:bg-surface rounded">
              Tools
            </Link>
            <Link href="/pricing" className="block px-3 py-2 text-muted hover:bg-surface rounded">
              Pricing
            </Link>
            <Link href="/blog" className="block px-3 py-2 text-muted hover:bg-surface rounded">
              Blog
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
