import React from 'react';

interface ToolHeroProps {
  title: string;
  subtitle: string;
  description?: string;
  icon?: string;
  className?: string;
}

export const ToolHero: React.FC<ToolHeroProps> = ({
  title,
  subtitle,
  description,
  icon = '⚙️',
  className = '',
}) => {
  return (
    <div className={`bg-linear-to-r from-surface to-bg-light py-12 sm:py-16 ${className}`}>
      <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
        {icon && <div className="mb-6 text-6xl">{icon}</div>}

        <h1 className="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-xl text-muted">
          {subtitle}
        </p>

        {description && (
          <p className="mx-auto mt-6 max-w-3xl text-base text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default ToolHero;
