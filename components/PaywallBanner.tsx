import React from 'react';
import Button from './Button';

interface PaywallBannerProps {
  usesRemaining: number;
  totalUses?: number;
  onUnlock?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const PaywallBanner: React.FC<PaywallBannerProps> = ({
  usesRemaining,
  totalUses = 3,
  onUnlock,
  isLoading = false,
  className = '',
}) => {
  const isLocked = usesRemaining <= 0;

  return (
    <div className={`bg-card border border-surface p-6 rounded-lg ${className} ${isLocked ? 'ring-2 ring-primary/10' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h3 className="font-semibold text-navy">
              {isLocked ? 'Free Uses Exhausted' : `${usesRemaining} of ${totalUses} Uses Remaining`}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {isLocked
                ? "You've used all your free generations. Upgrade to unlock unlimited access."
                : `You have ${usesRemaining} free ${usesRemaining === 1 ? 'use' : 'uses'} remaining.`}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          isLoading={isLoading}
          onClick={onUnlock}
          className="shrink-0"
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default PaywallBanner;
