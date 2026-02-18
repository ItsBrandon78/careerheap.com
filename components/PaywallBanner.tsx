import React from 'react'
import Link from 'next/link'
import Button from './Button'
import { ArrowRightIcon } from './Icons'

interface PaywallBannerProps {
  usesRemaining: number
  onUnlock?: () => void
  isLoading?: boolean
  className?: string
}

export const PaywallBanner: React.FC<PaywallBannerProps> = ({
  usesRemaining,
  onUnlock,
  isLoading = false,
  className = ''
}) => {
  const locked = usesRemaining <= 0

  return (
    <div
      className={`mx-auto w-full max-w-tool rounded-lg border border-border bg-surface p-10 text-center shadow-panel ${className}`}
    >
      <h3 className="text-2xl font-bold text-text-primary">
        {locked ? "You've used your 3 free lifetime reports" : `${usesRemaining} free uses remaining`}
      </h3>
      <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
        {locked
          ? 'Upgrade to keep building career reports with unlimited usage, resume upload, and full roadmap output.'
          : 'Upgrade anytime to keep going without limits and unlock premium features.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onUnlock ? (
          <Button variant="primary" isLoading={isLoading} onClick={onUnlock}>
            <ArrowRightIcon className="h-4 w-4" />
            Upgrade to Pro - $7/mo
          </Button>
        ) : (
          <Link href="/pricing">
            <Button variant="primary">
              <ArrowRightIcon className="h-4 w-4" />
              Upgrade to Pro - $7/mo
            </Button>
          </Link>
        )}
        <Link href="/pricing">
          <Button variant="outline">Get Lifetime - $49</Button>
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[13px] text-text-tertiary">
        <span>Cancel anytime</span>
        <span>Instant access</span>
        <span>Secure payment</span>
      </div>
    </div>
  )
}

export default PaywallBanner
