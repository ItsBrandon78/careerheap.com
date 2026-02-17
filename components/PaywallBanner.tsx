import React from 'react'
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
        {locked ? 'Unlock unlimited analyses' : `${usesRemaining} free uses remaining`}
      </h3>
      <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
        {locked
          ? 'You have used all free attempts for this tool. Upgrade to continue and unlock all CareerHeap tools.'
          : 'Upgrade anytime to keep going without limits and access every CareerHeap tool.'}
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="primary" isLoading={isLoading} onClick={onUnlock}>
          <ArrowRightIcon className="h-4 w-4" />
          Upgrade to Continue
        </Button>
      </div>
    </div>
  )
}

export default PaywallBanner