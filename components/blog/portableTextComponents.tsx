import Link from 'next/link'
import type { PortableTextComponents } from '@portabletext/react'
import CalloutBox from '@/components/blog/CalloutBox'
import type { BlogCalloutBlock } from '@/lib/blog/types'

export const portableTextComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    normal: ({ children }) => <p>{children}</p>
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href as string | undefined
      if (!href) {
        return <>{children}</>
      }

      const isExternal = href.startsWith('http')
      if (isExternal) {
        return (
          <a href={href} rel="noopener noreferrer" target="_blank">
            {children}
          </a>
        )
      }

      return <Link href={href}>{children}</Link>
    }
  },
  types: {
    callout: ({ value }) => {
      const callout = value as BlogCalloutBlock
      return (
        <CalloutBox
          variant={callout.variant || 'info'}
          title={callout.title}
          body={callout.body}
        />
      )
    }
  }
}
