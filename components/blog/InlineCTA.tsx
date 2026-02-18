import Link from 'next/link'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { ArrowRightIcon } from '@/components/Icons'

interface InlineCTAProps {
  compact?: boolean
}

export default function InlineCTA({ compact = false }: InlineCTAProps) {
  return (
    <aside
      className={`rounded-lg border border-accent/20 bg-accent-light ${
        compact ? 'p-5' : 'p-6'
      }`}
    >
      <div className="flex flex-col gap-3">
        <Badge className="w-fit">FLAGSHIP TOOL</Badge>
        <h3
          className={`font-bold text-text-primary ${
            compact ? 'text-xl leading-[1.3]' : 'text-2xl leading-[1.25]'
          }`}
        >
          Want a personalized roadmap? Use the Career Switch Planner -&gt;
        </h3>
        <p className="text-[15px] leading-[1.65] text-text-secondary">
          Build your transition strategy with role-fit diagnostics, 30/60/90 priorities,
          and resume-ready positioning.
        </p>
        <div>
          <Link href="/tools/career-switch-planner">
            <Button variant="primary" className={compact ? 'w-full' : ''}>
              <ArrowRightIcon className="h-4 w-4" />
              Start My Career Plan
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
