import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false
}) => {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-card ${
        hover ? 'transition-all hover:-translate-y-0.5 hover:shadow-panel' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default Card
