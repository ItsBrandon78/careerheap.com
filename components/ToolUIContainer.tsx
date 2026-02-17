import React from 'react'

interface ToolUIContainerProps {
  children: React.ReactNode
  className?: string
}

export const ToolUIContainer: React.FC<ToolUIContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-xl border border-surface bg-card p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export default ToolUIContainer
