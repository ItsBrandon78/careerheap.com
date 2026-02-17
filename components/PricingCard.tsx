import React from 'react';
import Badge from './Badge';
import Button from './Button';

interface PricingCardProps {
  name: string;
  price: number;
  period: 'month' | 'year';
  description: string;
  features: string[];
  highlighted?: boolean;
  buttonText?: string;
  onSelect?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  buttonText = 'Get Started',
  onSelect,
}) => {
  return (
    <div
      className={`relative rounded-lg border-2 p-8 transition-all ${
        highlighted
          ? 'border-primary bg-surface ring-2 ring-primary ring-offset-2'
          : 'border-surface bg-card'
      }`}
    >
      {highlighted && <Badge variant="primary" className="mb-4">Most Popular</Badge>}

      <h3 className="text-2xl font-bold text-navy">{name}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>

      <div className="mt-6">
        <span className="text-5xl font-bold text-navy">${price}</span>
        <span className="text-muted">/ {period}</span>
      </div>

      <Button
        variant={highlighted ? 'primary' : 'outline'}
        size="lg"
        className="mt-6 w-full"
        onClick={onSelect}
      >
        {buttonText}
      </Button>

      <div className="mt-8 space-y-4">
        <p className="text-sm font-semibold text-gray-900">What&apos;s included:</p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-muted">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PricingCard;
