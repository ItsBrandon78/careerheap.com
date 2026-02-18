import Link from 'next/link'
import Button from '@/components/Button'
import { ArrowRightIcon } from '@/components/Icons'

interface BlogHeroProps {
  title: string
  subtitle: string
}

export default function BlogHero({ title, subtitle }: BlogHeroProps) {
  return (
    <section className="bg-bg-secondary px-4 py-section lg:px-[170px]">
      <div className="mx-auto flex max-w-content flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-[1.5px] text-accent">
          Written in Sanity Studio | Published on CareerHeap
        </p>
        <h1 className="text-[42px] font-bold leading-[1.08] text-text-primary md:text-[48px]">
          {title}
        </h1>
        <p className="max-w-[760px] text-lg leading-[1.65] text-text-secondary">{subtitle}</p>
        <div className="pt-2">
          <Link href="/tools/career-switch-planner">
            <Button variant="primary">
              <ArrowRightIcon className="h-4 w-4" />
              Start My Career Plan
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
