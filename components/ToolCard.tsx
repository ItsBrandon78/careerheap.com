import React from 'react';
import Link from 'next/link';
import Badge from './Badge';

interface ToolCardProps {
  title: string;
  description: string;
  slug: string;
  category: string;
  icon?: string;
  isActive?: boolean;
  usesRemaining?: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  slug,
  category,
  icon = '⚙️',
  isActive = true,
  usesRemaining,
}) => {
  return (
    <Link href={`/tools/${slug}`}>
      <div className="group relative overflow-hidden rounded-lg border border-surface bg-card p-6 transition-all hover:border-primary hover:shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <div className="text-4xl">{icon}</div>
          {!isActive && <Badge variant="warning">Coming Soon</Badge>}
        </div>

        <h3 className="mb-2 text-xl font-bold text-navy">{title}</h3>
        <p className="mb-4 text-sm text-muted">{description}</p>

        <div className="flex items-center justify-between">
          <span className="inline-block text-xs font-semibold text-primary">
            {category}
          </span>
          {usesRemaining !== undefined && (
            <Badge variant={usesRemaining > 0 ? 'success' : 'warning'}>
              {usesRemaining}/3 uses
            </Badge>
          )}
        </div>

        <div className="absolute inset-0 bg-linear-to-r from-sky-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-5" />
      </div>
    </Link>
  );
};

export default ToolCard;
