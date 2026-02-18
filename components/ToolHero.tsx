import React from 'react'
import Badge from './Badge'
import { SparklesIcon, ToolGlyph } from './Icons'

interface ToolHeroProps {
  title: string
  description: string
  icon?: 'resume' | 'interview' | 'cover' | 'job' | 'planner'
  usesLabel?: string
}

export const ToolHero: React.FC<ToolHeroProps> = ({
  title,
  description,
  icon = 'resume',
  usesLabel = '3 Free Uses'
}) => {
  return (
    <section className="w-full bg-bg-secondary px-4 lg:px-[170px]">
      <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 py-12 text-center">
        <Badge className="gap-1.5" variant="default">
          <SparklesIcon className="h-3.5 w-3.5" />
          {usesLabel}
        </Badge>

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-light text-accent">
            <ToolGlyph kind={icon} className="h-5 w-5" />
          </span>
          <h1 className="text-[40px] font-bold leading-tight text-text-primary">{title}</h1>
        </div>

        <p className="max-w-[600px] text-lg leading-[1.6] text-text-secondary">{description}</p>
      </div>
    </section>
  )
}

export default ToolHero
