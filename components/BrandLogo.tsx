import React from 'react'

type LogoVariant = 'color' | 'mono' | 'white'
type LogoSize = 'sm' | 'md' | 'lg'

interface BrandLogoProps {
  variant?: LogoVariant
  size?: LogoSize
  showWordmark?: boolean
  className?: string
}

function symbolColors(variant: LogoVariant) {
  if (variant === 'white') {
    return {
      primary: '#FFFFFF',
      accent: '#FFFFFF',
      text: 'text-text-on-dark'
    }
  }

  if (variant === 'mono') {
    return {
      primary: '#0B1425',
      accent: '#0B1425',
      text: 'text-text-primary'
    }
  }

  return {
    primary: '#245DFF',
    accent: '#0EA5A4',
    text: 'text-text-primary'
  }
}

function sizeClass(size: LogoSize) {
  if (size === 'sm') {
    return {
      symbol: 'h-7 w-7',
      wordmark: 'text-[18px]'
    }
  }

  if (size === 'lg') {
    return {
      symbol: 'h-10 w-10',
      wordmark: 'text-[28px]'
    }
  }

  return {
    symbol: 'h-8 w-8',
    wordmark: 'text-[22px]'
  }
}

export default function BrandLogo({
  variant = 'color',
  size = 'md',
  showWordmark = true,
  className = ''
}: BrandLogoProps) {
  const colors = symbolColors(variant)
  const sizes = sizeClass(size)

  return (
    <span className={`inline-flex items-center gap-2.5 ${colors.text} ${className}`.trim()}>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className={`${sizes.symbol} shrink-0`}
      >
        <path
          d="M4 34V22H12V18H20V14H28V10H36V34H4Z"
          fill={colors.primary}
        />
        <rect x="28" y="6" width="8" height="4" fill={colors.accent} />
      </svg>
      {showWordmark ? (
        <span className={`${sizes.wordmark} font-heading font-semibold tracking-[-0.02em]`}>
          CareerHeap
        </span>
      ) : null}
    </span>
  )
}

