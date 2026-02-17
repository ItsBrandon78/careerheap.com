import React from 'react'

interface ToolUIContainerProps {
  children: React.ReactNode
  className?: string
}

export const ToolUIContainer: React.FC<ToolUIContainerProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`mx-auto w-full max-w-tool rounded-lg border border-border bg-surface p-8 shadow-panel ${className}`}
    >
      {children}
    </div>
  )
}

export default ToolUIContainer