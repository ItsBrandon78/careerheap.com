import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { ArrowRightIcon, SparklesIcon, ToolGlyph } from '@/components/Icons'

interface FeaturedToolCardProps {
  slug: string
  title: string
  subtitle: string
  primaryCta: string
  popularityLabel?: string
  usageLabel?: string
}

export default function FeaturedToolCard({
  slug,
  title,
  subtitle,
  primaryCta,
  popularityLabel = 'Most Popular',
  usageLabel = '3 Free Uses'
}: FeaturedToolCardProps) {
  return (
    <Card className="w-full p-6 shadow-panel md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5" />
              {popularityLabel}
            </Badge>
            <Badge>{usageLabel}</Badge>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent-light text-accent">
              <ToolGlyph kind="target" className="h-6 w-6" />
            </span>
            <h3 className="text-[30px] font-bold leading-tight text-text-primary">{title}</h3>
          </div>

          <p className="mt-3 max-w-[680px] text-base leading-[1.7] text-text-secondary">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[220px]">
          <Link href={`/tools/${slug}`}>
            <Button variant="primary" className="w-full">
              <ArrowRightIcon className="h-4 w-4" />
              {primaryCta}
            </Button>
          </Link>
          <Link href="/tools" className="text-center text-sm font-medium text-accent hover:text-accent-hover">
            View all tools
          </Link>
        </div>
      </div>
    </Card>
  )
}
