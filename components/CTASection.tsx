import React from 'react'
import Button from './Button'
import { ArrowRightIcon } from './Icons'

interface CTASectionProps {
  title: string
  subtitle: string
  primaryButtonText?: string
  secondaryButtonText?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  className?: string
}

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  subtitle,
  primaryButtonText = 'Get Started',
  secondaryButtonText,
  onPrimaryClick,
  onSecondaryClick,
  className = ''
}) => {
  return (
    <section className={`px-4 py-section lg:px-[170px] ${className}`}>
      <div className="mx-auto max-w-content rounded-lg bg-bg-dark px-8 py-10 text-center">
        <h2 className="text-[32px] font-bold text-text-on-dark">{title}</h2>
        <p className="mt-3 text-base text-text-on-dark-muted">{subtitle}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button variant="primary" onClick={onPrimaryClick}>
            <ArrowRightIcon className="h-4 w-4" />
            {primaryButtonText}
          </Button>
          {secondaryButtonText && (
            <Button variant="outline" onClick={onSecondaryClick} className="border-border text-text-on-dark hover:bg-bg-dark-surface">
              {secondaryButtonText}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

export default CTASection