import React from 'react'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'border border-accent/20 bg-accent-light text-accent',
    success: 'border border-success/20 bg-success-light text-success',
    warning: 'border border-warning/25 bg-warning-light text-warning',
    error: 'border border-error/20 bg-error-light text-error',
    info: 'border border-accent/20 bg-accent-light text-accent'
  }

  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-[13px] font-semibold leading-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
