import React from 'react'
import Link from 'next/link'
import Button from './Button'
import { ArrowRightIcon } from './Icons'

interface CTASectionProps {
  title: string
  subtitle: string
  primaryButtonText?: string
  secondaryButtonText?: string
  primaryHref?: string
  secondaryHref?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  className?: string
}

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  subtitle,
  primaryButtonText = 'Get Started',
  secondaryButtonText,
  primaryHref,
  secondaryHref,
  onPrimaryClick,
  onSecondaryClick,
  className = ''
}) => {
  return (
    <section className={`px-4 py-section lg:px-[170px] ${className}`}>
      <div className="mx-auto max-w-content rounded-lg bg-bg-dark px-5 py-8 text-center sm:px-6 sm:py-9 md:px-8 md:py-10">
        <h2 className="text-[28px] font-bold leading-[1.2] text-text-on-dark md:text-[32px]">{title}</h2>
        <p className="mt-2.5 text-[15px] leading-[1.65] text-text-on-dark-muted md:text-base">{subtitle}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {primaryHref ? (
            <Link href={primaryHref}>
              <Button variant="primary">
                <ArrowRightIcon className="h-4 w-4" />
                {primaryButtonText}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={onPrimaryClick}>
              <ArrowRightIcon className="h-4 w-4" />
              {primaryButtonText}
            </Button>
          )}
          {secondaryButtonText && (
            secondaryHref ? (
              <Link href={secondaryHref}>
                <Button variant="outline" className="border-border text-text-on-dark hover:bg-bg-dark-surface">
                  {secondaryButtonText}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={onSecondaryClick} className="border-border text-text-on-dark hover:bg-bg-dark-surface">
                {secondaryButtonText}
              </Button>
            )
          )}
        </div>
      </div>
    </section>
  )
}

export default CTASection
