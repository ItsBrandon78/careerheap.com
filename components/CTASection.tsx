import React from 'react';
import Button from './Button';

interface CTASectionProps {
  title: string;
  subtitle: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  className?: string;
}

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  subtitle,
  primaryButtonText = 'Get Started',
  secondaryButtonText = 'Learn More',
  onPrimaryClick,
  onSecondaryClick,
  className = '',
}) => {
  return (
    <section className={`bg-linear-to-r from-sky-600 to-emerald-600 py-12 sm:py-16 ${className}`}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
          {subtitle}
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onPrimaryClick}
            className="bg-white text-sky-600 hover:bg-gray-100"
          >
            {primaryButtonText}
          </Button>
          {secondaryButtonText && (
            <Button
              variant="outline"
              size="lg"
              onClick={onSecondaryClick}
              className="border-white text-white hover:bg-white/10"
            >
              {secondaryButtonText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
