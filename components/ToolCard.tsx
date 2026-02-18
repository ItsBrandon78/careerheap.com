import React from 'react'
import Link from 'next/link'
import Badge from './Badge'
import Card from './Card'
import Button from './Button'
import { ArrowRightIcon, ToolGlyph } from './Icons'

interface ToolCardProps {
  title: string
  description: string
  slug: string
  icon?: 'resume' | 'interview' | 'cover' | 'job' | 'planner'
  isActive?: boolean
  usesRemaining?: number
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  slug,
  icon = 'resume',
  isActive = true,
  usesRemaining
}) => {
  const usageLabel =
    usesRemaining === undefined
      ? '3 Free Uses'
      : `${Math.max(usesRemaining, 0)} Free ${Math.max(usesRemaining, 0) === 1 ? 'Use' : 'Uses'}`

  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-light text-accent">
          <ToolGlyph kind={icon} className="h-5 w-5" />
        </div>
        {isActive ? (
          <Badge variant="default">{usageLabel}</Badge>
        ) : (
          <Badge variant="warning">Coming Soon</Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm leading-[1.6] text-text-secondary">{description}</p>
      </div>

      <Link href={`/tools/${slug}`}>
        <Button variant="primary" size="md" className="w-full">
          <ArrowRightIcon className="h-4 w-4" />
          Try Free
        </Button>
      </Link>
    </Card>
  )
}

export default ToolCard
