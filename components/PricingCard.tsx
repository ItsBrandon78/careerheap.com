import React from 'react'
import Link from 'next/link'
import Button from './Button'
import Card from './Card'
import { CheckIcon } from './Icons'

interface PricingCardProps {
  name: string
  price: string
  subtitle: string
  features: string[]
  highlighted?: boolean
  badge?: string
  buttonText?: string
  href?: string
  onSelect?: () => void
  detailsSlot?: React.ReactNode
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  subtitle,
  features,
  highlighted = false,
  badge,
  buttonText = 'Get Started',
  href,
  onSelect,
  detailsSlot
}) => {
  return (
    <Card
      className={`p-8 shadow-panel ${
        highlighted ? 'border-2 border-accent' : 'border border-border'
      }`}
    >
      {(highlighted || badge) && (
        <p className="mb-2 text-[13px] font-semibold text-accent">{badge ?? 'Best Value'}</p>
      )}
      <p className="text-sm font-semibold text-text-secondary">{name}</p>
      <p className="mt-3 text-[44px] font-bold leading-none text-text-primary">{price}</p>
      <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
      {detailsSlot ? <div className="mt-4">{detailsSlot}</div> : null}

      <ul className="mt-6 space-y-3 text-[15px] text-text-primary">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-success" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {href ? (
          <Link href={href}>
            <Button variant="primary" className="w-full">
              {buttonText}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" className="w-full" onClick={onSelect}>
            {buttonText}
          </Button>
        )}
      </div>
    </Card>
  )
}

export default PricingCard
