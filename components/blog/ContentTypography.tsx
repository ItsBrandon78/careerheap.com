import type { ReactNode } from 'react'

interface ContentTypographyProps {
  children: ReactNode
}

export default function ContentTypography({ children }: ContentTypographyProps) {
  return (
    <div
      className="
        space-y-6 text-[17px] leading-[1.8] text-text-secondary
        [&_h2]:mt-8 [&_h2]:text-[32px] [&_h2]:font-bold [&_h2]:leading-[1.2] [&_h2]:text-text-primary
        [&_h3]:mt-6 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:leading-[1.25] [&_h3]:text-text-primary
        [&_blockquote]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-bg-secondary [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-base [&_blockquote]:font-medium [&_blockquote]:italic [&_blockquote]:text-text-secondary
        [&_p]:text-[17px] [&_p]:leading-[1.8]
        [&_ul]:space-y-2 [&_ul]:pl-5
        [&_li]:text-[17px] [&_li]:leading-[1.75]
        [&_a]:font-semibold [&_a]:text-accent [&_a:hover]:text-accent-hover
      "
    >
      {children}
    </div>
  )
}
