import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  const variantStyles: Record<string, string> = {
    success: 'bg-accent/10 text-accent border border-accent/20',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    error: 'bg-red-100 text-red-800 border border-red-300',
    info: 'bg-primary/10 text-primary border border-primary/20',
    primary: 'bg-primary/10 text-primary border border-primary/20',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
