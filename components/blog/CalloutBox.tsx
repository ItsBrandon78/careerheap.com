import type { BlogCalloutVariant } from '@/lib/blog/types'

interface CalloutBoxProps {
  variant: BlogCalloutVariant
  title: string
  body: string
}

const styles: Record<
  BlogCalloutVariant,
  { wrapper: string; title: string; border: string }
> = {
  info: {
    wrapper: 'bg-accent-light',
    title: 'text-accent',
    border: 'border-accent/20'
  },
  tip: {
    wrapper: 'bg-success-light',
    title: 'text-success',
    border: 'border-success/30'
  },
  warning: {
    wrapper: 'bg-warning-light',
    title: 'text-warning',
    border: 'border-warning/35'
  }
}

export default function CalloutBox({ variant, title, body }: CalloutBoxProps) {
  const style = styles[variant] ?? styles.info

  return (
    <aside className={`rounded-lg border p-4 ${style.wrapper} ${style.border}`}>
      <p className={`text-sm font-bold ${style.title}`}>{title}</p>
      <p className="mt-1 text-[15px] leading-[1.65] text-text-secondary">{body}</p>
    </aside>
  )
}
