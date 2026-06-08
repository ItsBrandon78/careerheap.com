import React from 'react'
import { Icon } from './ui/Icon'

/**
 * Page hero band, ported 1:1 from the prototype (Chrome.jsx PageHero):
 * bg-secondary, bottom border, 64px/56px padding, centered badge + clamp title + sub.
 */
export default function PageHero({
  badge,
  badgeIcon,
  title,
  sub,
  children
}: {
  badge?: string
  badgeIcon?: string
  title: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <section className="border-b border-border-light bg-bg-secondary" style={{ padding: '64px 0 56px' }}>
      <div className="mx-auto max-w-content px-4 text-center sm:px-6">
        {badge && (
          <span className="anim-up inline-flex items-center gap-1.5 rounded-pill bg-accent-light px-[11px] py-[5px] text-[12px] font-semibold text-accent">
            {badgeIcon && <Icon name={badgeIcon} size={13} fill />}
            {badge}
          </span>
        )}
        <h1 className="anim-up font-extrabold" style={{ fontSize: 'clamp(30px,4.4vw,46px)', marginTop: 18, animationDelay: '.05s' }}>
          {title}
        </h1>
        {sub && (
          <p
            className="anim-up text-[17px] leading-[1.6] text-text-secondary"
            style={{ maxWidth: 600, margin: '14px auto 0', animationDelay: '.1s' }}
          >
            {sub}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
