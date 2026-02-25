import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/45 disabled:cursor-not-allowed disabled:opacity-60'

    const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-accent text-text-on-dark shadow-button hover:bg-accent-hover active:translate-y-px',
      secondary:
        'bg-primary text-text-on-dark shadow-card hover:bg-primary-light active:translate-y-px',
      ghost:
        'bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
      outline:
        'border border-border bg-surface text-text-secondary hover:border-accent hover:bg-accent-light hover:text-accent'
    }

    const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-[15px]',
      lg: 'px-6 py-3 text-[15px]'
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
