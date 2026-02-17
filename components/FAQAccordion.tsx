'use client'

import React, { useState } from 'react'
import { ChevronDownIcon } from './Icons'

interface FAQItem {
  question: string
  answer: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  className?: string
  compact?: boolean
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  className = '',
  compact = false
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(compact ? null : 0)

  return (
    <div className={className}>
      {items.map((item, index) => (
        <article key={item.question} className="border-b border-border py-5">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <h3 className="text-base font-semibold text-text-primary">{item.question}</h3>
            <ChevronDownIcon
              className={`h-5 w-5 text-text-tertiary transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIndex === index && (
            <p className="mt-3 text-sm leading-[1.6] text-text-secondary">{item.answer}</p>
          )}
        </article>
      ))}
    </div>
  )
}

export default FAQAccordion