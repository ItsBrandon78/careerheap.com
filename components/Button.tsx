import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
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
      'font-semibold transition-all inline-flex items-center justify-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantStyles: Record<string, string> = {
      primary:
        'bg-primary text-white hover:bg-primary-600 focus:ring-primary-600 disabled:opacity-50',
      secondary:
        'bg-accent text-white hover:brightness-95 focus:ring-accent disabled:opacity-50',
      outline:
        'border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary disabled:opacity-50',
      ghost:
        'text-muted hover:bg-surface focus:ring-muted disabled:opacity-50',
    };

    const sizeStyles: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
