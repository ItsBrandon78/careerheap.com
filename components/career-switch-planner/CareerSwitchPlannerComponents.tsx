'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode
} from 'react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { CheckIcon, ChevronDownIcon, SparklesIcon, ToolGlyph } from '@/components/Icons'
import BaseFAQAccordion from '@/components/FAQAccordion'
import type {
  GapDifficulty,
  PlannerRecommendedRole,
  PlannerResultView,
  PlannerResumeReframe
} from '@/lib/planner/types'

type ToolTab = 'paste' | 'upload'

interface SectionProps {
  children: ReactNode
  className?: string
}

export function ToolHero({ children, className = '' }: SectionProps) {
  return (
    <section className={`bg-bg-secondary px-4 py-14 lg:px-[170px] ${className}`}>
      <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 text-center">
        {children}
      </div>
    </section>
  )
}

export function InputCard({ children, className = '' }: SectionProps) {
  return (
    <Card className={`mx-auto w-full max-w-tool p-5 shadow-panel md:p-8 ${className}`}>{children}</Card>
  )
}

interface RoleSuggestion {
  occupationId: string
  title: string
}

interface RoleAutocompleteProps {
  id: string
  label: string
  value: string
  placeholder: string
  region?: 'US' | 'CA' | 'either'
  helperText?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function RoleAutocomplete({
  id,
  label,
  value,
  placeholder,
  region = 'either',
  helperText,
  disabled = false,
  onChange
}: RoleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) {
      return
    }

    const controller = new AbortController()

    const searchParams = new URLSearchParams({ q: query, limit: '6' })
    if (region === 'US' || region === 'CA') {
      searchParams.set('region', region)
    }

    void fetch(`/api/career-map/occupations?${searchParams.toString()}`, {
      signal: controller.signal,
      cache: 'no-store'
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | {
              items?: Array<{
                occupationId?: string
                title?: string
              }>
            }
          | null

        if (!response.ok || !Array.isArray(data?.items)) {
          setSuggestions([])
          return
        }

        const nextSuggestions: RoleSuggestion[] = data.items
          .map((item) => {
            const title = typeof item.title === 'string' ? item.title.trim() : ''
            const occupationId =
              typeof item.occupationId === 'string' ? item.occupationId : title.toLowerCase()
            if (!title) return null
            return { occupationId, title }
          })
          .filter((item): item is RoleSuggestion => Boolean(item))

        setSuggestions(nextSuggestions)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSuggestions([])
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [region, value])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  return (
    <label htmlFor={id} className="flex w-full flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-text-primary">{label}</span>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            closeTimerRef.current = setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            const nextValue = event.target.value
            onChange(nextValue)
            if (nextValue.trim().length < 2) {
              setSuggestions([])
              setIsLoading(false)
            } else {
              setIsLoading(true)
            }
            if (!isOpen) setIsOpen(true)
          }}
          className="w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-tertiary"
        />
        {isOpen && (suggestions.length > 0 || isLoading) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-md border border-border bg-surface shadow-card">
            {isLoading ? (
              <p className="px-3 py-2 text-xs text-text-secondary">Searching roles...</p>
            ) : (
              <ul role="listbox" className="py-1">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.occupationId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-secondary"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        onChange(suggestion.title)
                        setIsOpen(false)
                      }}
                    >
                      {suggestion.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-text-tertiary">{helperText}</p> : null}
    </label>
  )
}

interface SkillsChipsInputProps {
  id: string
  label: string
  skills: string[]
  suggestions: string[]
  placeholder: string
  helperText?: string
  onChange: (skills: string[]) => void
}

export function SkillsChipsInput({
  id,
  label,
  skills,
  suggestions,
  placeholder,
  helperText,
  onChange
}: SkillsChipsInputProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const normalizedSkills = useMemo(() => new Set(skills.map((skill) => skill.toLowerCase())), [skills])
  const normalizedQuery = query.trim().toLowerCase()

  const filteredSuggestions = useMemo(
    () =>
      suggestions
        .filter((skill) => {
          const normalized = skill.toLowerCase()
          if (!normalized.includes(normalizedQuery)) return false
          return !normalizedSkills.has(normalized)
        })
        .slice(0, 6),
    [normalizedQuery, normalizedSkills, suggestions]
  )

  const canUseCustom =
    normalizedQuery.length > 1 &&
    !normalizedSkills.has(normalizedQuery) &&
    !filteredSuggestions.some((suggestion) => suggestion.toLowerCase() === normalizedQuery)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const addSkill = (value: string) => {
    const next = value.trim()
    if (!next) return
    if (normalizedSkills.has(next.toLowerCase())) {
      setQuery('')
      setIsOpen(false)
      return
    }
    onChange([...skills, next])
    setQuery('')
    setIsOpen(false)
  }

  const removeSkill = (value: string) => {
    onChange(skills.filter((skill) => skill !== value))
  }

  return (
    <label htmlFor={id} className="flex w-full flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-text-primary">{label}</span>
      <div className="rounded-md border border-border bg-bg-secondary p-2.5">
        <div className="mb-2 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-pill border border-border-light bg-surface px-2 py-1 text-xs text-text-primary"
            >
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                className="text-text-tertiary hover:text-text-primary"
                onClick={() => removeSkill(skill)}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            id={id}
            type="text"
            value={query}
            placeholder={placeholder}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              closeTimerRef.current = setTimeout(() => setIsOpen(false), 120)
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addSkill(query)
              }
              if (event.key === 'Backspace' && !query && skills.length > 0) {
                removeSkill(skills[skills.length - 1])
              }
            }}
            className="w-full rounded-md border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          {isOpen && query.trim() ? (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-md border border-border bg-surface shadow-card">
              <ul role="listbox" className="py-1">
                {filteredSuggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-secondary"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        addSkill(suggestion)
                      }}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
                {canUseCustom ? (
                  <li>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-bg-secondary"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        addSkill(query)
                      }}
                    >
                      Use &quot;{query.trim()}&quot;
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        {skills.length === 0 ? (
          <p className="mt-2 text-xs text-text-tertiary">
            Try: stakeholder management, electrical safety, SQL.
          </p>
        ) : null}
      </div>
      {helperText ? (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      ) : null}
    </label>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`flex h-6 w-11 rounded-pill p-1 transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
      <span className="text-sm font-semibold text-text-primary">{label}</span>
    </button>
  )
}

interface SegmentedTabsProps {
  activeTab: ToolTab
  onChange: (tab: ToolTab) => void
  uploadLocked?: boolean
}

export function SegmentedTabs({ activeTab, onChange, uploadLocked = false }: SegmentedTabsProps) {
  const tabClass = (selected: boolean) =>
    `rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
      selected ? 'bg-surface text-text-primary shadow-card' : 'text-text-secondary hover:text-text-primary'
    }`

  return (
    <div className="grid w-full grid-cols-2 gap-2 rounded-lg bg-bg-secondary p-1">
      <button type="button" className={tabClass(activeTab === 'paste')} onClick={() => onChange('paste')}>
        Paste Experience
      </button>
      <button
        type="button"
        className={`${tabClass(activeTab === 'upload')} ${uploadLocked ? 'opacity-70' : ''}`}
        onClick={() => onChange('upload')}
      >
        Upload Resume (Pro)
      </button>
    </div>
  )
}

interface DropzoneUploadProps {
  onFileSelected: (file: File | null) => void
  disabled?: boolean
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function DropzoneUpload({ onFileSelected, disabled = false }: DropzoneUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [lastSelectedFile, setLastSelectedFile] = useState<string>('')

  const applyFile = (file: File | null) => {
    onFileSelected(file)
    if (file) {
      setLastSelectedFile(`${file.name} (${formatFileSize(file.size)})`)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    applyFile(file)
    event.target.value = ''
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragActive(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragActive(false)
        if (disabled) return
        const file = event.dataTransfer?.files?.[0] ?? null
        applyFile(file)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border px-4 py-8 text-center transition-colors ${
        disabled
          ? 'cursor-not-allowed border-border bg-surface opacity-60'
          : isDragActive
            ? 'border-accent bg-accent-light'
            : 'border-border bg-surface hover:border-accent/40'
      }`}
    >
      <span className="text-[15px] font-semibold text-accent">Upload PDF/DOCX</span>
      <span className="text-xs text-text-secondary">Click to browse or drag and drop</span>
      <span className="text-xs text-text-tertiary">PDF/DOCX - Max 10MB</span>
      {lastSelectedFile ? (
        <span className="rounded-pill bg-bg-secondary px-3 py-1 text-xs text-text-secondary">
          {lastSelectedFile}
        </span>
      ) : null}
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={disabled}
        onChange={handleFileChange}
      />
    </label>
  )
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-bg-secondary p-3"
    >
      <span className="text-[13px] font-semibold text-text-secondary">{label}</span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-md border border-border-light bg-surface px-3 py-2 pr-9 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      </div>
    </label>
  )
}

interface ParseProgressProps {
  progress: number
  label?: string
}

export function ParseProgress({ progress, label = 'Extracting text...' }: ParseProgressProps) {
  const safeProgress = Math.min(100, Math.max(0, progress))
  const widthClass =
    safeProgress >= 95
      ? 'w-full'
      : safeProgress >= 85
        ? 'w-5/6'
        : safeProgress >= 70
          ? 'w-3/4'
          : safeProgress >= 55
            ? 'w-2/3'
            : safeProgress >= 40
              ? 'w-1/2'
              : safeProgress >= 25
                ? 'w-1/3'
                : safeProgress >= 10
                  ? 'w-1/4'
                  : 'w-[8%]'

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm font-semibold text-text-secondary">
        {label} {safeProgress}%
      </p>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-border">
        <div className={`h-full rounded-pill bg-accent transition-all ${widthClass}`} />
      </div>
    </div>
  )
}

interface ExtractedTextAreaProps {
  value: string
  onChange: (value: string) => void
}

export function ExtractedTextArea({ value, onChange }: ExtractedTextAreaProps) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-[13px] font-semibold text-text-primary">Extracted Resume Text (edit if needed)</span>
      <textarea
        value={value}
        rows={6}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-surface p-3 text-sm leading-[1.6] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
    </label>
  )
}

interface DetectedSectionsChipsProps {
  detected: {
    experience: boolean
    skills: boolean
    education: boolean
  }
}

export function DetectedSectionsChips({ detected }: DetectedSectionsChipsProps) {
  const sectionRows = [
    ['Experience', detected.experience],
    ['Skills', detected.skills],
    ['Education', detected.education]
  ] as const

  return (
    <div className="flex flex-wrap gap-2">
      {sectionRows.map(([label, ok]) => (
        <Badge key={label} variant={ok ? 'success' : 'warning'} className="gap-1.5">
          {ok && <CheckIcon className="h-3.5 w-3.5" />}
          {label}
        </Badge>
      ))}
    </div>
  )
}

interface ResumeExtractionReviewProps {
  detectedRole: string | null
  skills: string[]
  certifications: string[]
  onRemoveSkill: (value: string) => void
  onRemoveCertification: (value: string) => void
  onApply: () => void
  onDismiss: () => void
}

export function ResumeExtractionReviewCard({
  detectedRole,
  skills,
  certifications,
  onRemoveSkill,
  onRemoveCertification,
  onApply,
  onDismiss
}: ResumeExtractionReviewProps) {
  const hasContent = Boolean(detectedRole) || skills.length > 0 || certifications.length > 0
  if (!hasContent) return null

  return (
    <div className="mt-3 rounded-md border border-border bg-bg-secondary p-3">
      <p className="text-sm font-semibold text-text-primary">Review detected data before scoring</p>
      <p className="mt-1 text-xs text-text-secondary">
        Apply only what is correct. Only applied items are used in matching.
      </p>
      {detectedRole ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Role candidate</p>
          <Badge className="mt-1">{detectedRole}</Badge>
        </div>
      ) : null}
      {skills.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Detected skills</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-pill border border-border-light bg-surface px-2 py-1 text-xs text-text-primary"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill)}
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={`Remove ${skill}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {certifications.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Detected certifications</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {certifications.map((certification) => (
              <span
                key={certification}
                className="inline-flex items-center gap-1 rounded-pill border border-border-light bg-surface px-2 py-1 text-xs text-text-primary"
              >
                {certification}
                <button
                  type="button"
                  onClick={() => onRemoveCertification(certification)}
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={`Remove ${certification}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onApply}>
          Apply detected data
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}

type PrimaryButtonProps = ComponentProps<typeof Button>

export function PrimaryButton({ children, ...props }: PrimaryButtonProps) {
  return (
    <Button variant="primary" {...props}>
      <SparklesIcon className="h-4 w-4" />
      {children}
    </Button>
  )
}

interface ScoreCardProps {
  result: PlannerResultView
  notSureMode: boolean
  targetRole: string
}

export function ScoreCard({ result, notSureMode, targetRole }: ScoreCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-text-primary">
          {notSureMode ? 'Profile Compatibility Snapshot' : `Compatibility Score (${targetRole || 'Target Role'})`}
        </h3>
        <p className="text-[32px] font-bold leading-none text-accent">{result.score} / 100</p>
        <p className="text-sm leading-[1.6] text-text-secondary">{result.summary}</p>
        <div className="pt-1">
          <p className="mb-2 text-xs font-semibold text-text-secondary">Strongest matching skill areas</p>
          <div className="flex flex-wrap gap-2">
            {result.strongestAreas.map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

interface TransitionOverviewCardProps {
  currentRole: string
  targetRole: string
  entryFeasibility: string
  difficulty: string
  timeline: string
  salary: string
  nativeSalary?: string | null
  summary: string
}

export function TransitionOverviewCard({
  currentRole,
  targetRole,
  entryFeasibility,
  difficulty,
  timeline,
  salary,
  nativeSalary,
  summary
}: TransitionOverviewCardProps) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-text-primary">
        Transition Plan: {currentRole} -&gt; {targetRole}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>{entryFeasibility}</Badge>
        <Badge>{`Difficulty: ${difficulty}`}</Badge>
        <Badge>{`Timeline: ${timeline}`}</Badge>
        <Badge>{salary}</Badge>
      </div>
      {nativeSalary ? <p className="mt-2 text-xs text-text-tertiary">{nativeSalary}</p> : null}
      <p className="mt-3 text-sm leading-[1.6] text-text-secondary">{summary}</p>
    </Card>
  )
}

interface HaveNowCardProps {
  certifications: string[]
  matchedSkills: string[]
}

export function HaveNowCard({ certifications, matchedSkills }: HaveNowCardProps) {
  const certs = certifications.filter(Boolean).slice(0, 6)
  const skills = matchedSkills.filter(Boolean).slice(0, 8)
  if (certs.length === 0 && skills.length === 0) {
    return null
  }

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">What You Already Have</h3>
      {certs.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Certifications</p>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {certs.map((cert) => (
              <li key={cert}>- {cert}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {skills.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[1.1px] text-text-tertiary">Matched Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

interface NeedNextItem {
  title: string
  why: string
  level: 'Required' | 'Recommended'
}

interface NeedNextCardProps {
  items: NeedNextItem[]
}

export function NeedNextCard({ items }: NeedNextCardProps) {
  const validItems = items.filter((item) => item.title && item.why).slice(0, 7)
  if (validItems.length === 0) {
    return null
  }

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">What You Need Next</h3>
      <div className="mt-3 space-y-2">
        {validItems.map((item) => (
          <div key={`${item.level}-${item.title}`} className="rounded-md border border-border-light bg-bg-secondary p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              <Badge variant={item.level === 'Required' ? 'warning' : 'default'}>{item.level}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{item.why}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

interface BridgePhaseStep {
  id: string
  action: string
  estimate?: string
  resource?: { label: string; url: string } | null
}

interface BridgePhase {
  id: string
  title: string
  subtitle: string
  steps: BridgePhaseStep[]
}

interface BridgePlanPhasesProps {
  phases: BridgePhase[]
  emptyMessage: string
}

export function BridgePlanPhases({ phases, emptyMessage }: BridgePlanPhasesProps) {
  const hasSteps = phases.some((phase) => phase.steps.length > 0)
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Step-by-Step Bridge Plan</h3>
      {!hasSteps ? (
        <p className="mt-3 text-sm text-text-secondary">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {phases.map((phase) => (
            <div key={phase.id} className="rounded-md border border-border-light bg-bg-secondary p-3">
              <p className="text-sm font-semibold text-text-primary">{phase.title}</p>
              <p className="mt-1 text-xs text-text-tertiary">{phase.subtitle}</p>
              {phase.steps.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {phase.steps.map((step) => (
                    <li key={step.id} className="text-sm text-text-secondary">
                      <p className="font-medium text-text-primary">{step.action}</p>
                      {step.estimate ? <p className="text-xs text-text-tertiary">{step.estimate}</p> : null}
                      {step.resource ? (
                        <a href={step.resource.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:text-accent-hover">
                          {step.resource.label}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

interface CompatibilityBreakdownAccordionProps {
  score: number
  breakdown: {
    skill_overlap: number
    experience_similarity: number
    education_alignment: number
    certification_gap: number
    timeline_feasibility: number
  }
}

function breakdownWidth(value: number) {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(40, value)) : 0
  return `${(normalized / 40) * 100}%`
}

export function CompatibilityBreakdownAccordion({
  score,
  breakdown
}: CompatibilityBreakdownAccordionProps) {
  const rows: Array<{ key: keyof typeof breakdown; label: string }> = [
    { key: 'skill_overlap', label: 'Skill overlap' },
    { key: 'experience_similarity', label: 'Experience similarity' },
    { key: 'education_alignment', label: 'Education alignment' },
    { key: 'certification_gap', label: 'Certification gap' },
    { key: 'timeline_feasibility', label: 'Timeline feasibility' }
  ]

  return (
    <Card className="p-5">
      <details>
        <summary className="cursor-pointer text-base font-bold text-text-primary">
          See compatibility breakdown
        </summary>
        <p className="mt-2 text-sm text-text-secondary">
          This score measures similarity, not feasibility.
        </p>
        <p className="mt-2 text-[28px] font-bold leading-none text-accent">{score} / 100</p>
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>{row.label}</span>
                <span>{breakdown[row.key].toFixed(1)}</span>
              </div>
              <div className="h-2 rounded-pill bg-border">
                <div className="h-full rounded-pill bg-accent" style={{ width: breakdownWidth(breakdown[row.key]) }} />
              </div>
            </div>
          ))}
        </div>
      </details>
    </Card>
  )
}

interface ResourcesCardProps {
  links: Array<{ label: string; url: string }>
  regulated: boolean
}

export function ResourcesCard({ links, regulated }: ResourcesCardProps) {
  const validLinks = links.filter((link) => link.url && link.label)
  if (validLinks.length === 0) {
    return null
  }

  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Resources</h3>
      {regulated ? (
        <p className="mt-2 text-sm text-text-secondary">
          Regulated pathway detected. Review official licensing and registration resources.
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {validLinks.map((link) => (
          <li key={`${link.label}-${link.url}`}>
            <a href={link.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:text-accent-hover">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function SkillsChips({ skills }: { skills: string[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Transferable Skills</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
      </div>
    </Card>
  )
}

function difficultyBadgeVariant(difficulty: GapDifficulty) {
  if (difficulty === 'easy') return 'success' as const
  if (difficulty === 'medium') return 'default' as const
  return 'warning' as const
}

export function GapsList({ gaps }: { gaps: PlannerResultView['skillGaps'] }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Skill Gaps</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {gaps.map((gap) => (
          <li key={gap.title} className="flex flex-col gap-2 rounded-md border border-border-light bg-bg-secondary p-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">{gap.title}</p>
              <p className="text-sm text-text-secondary">{gap.detail}</p>
            </div>
            <Badge variant={difficultyBadgeVariant(gap.difficulty)} className="self-start">
              {gap.difficulty}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function RoadmapSteps({ roadmap }: { roadmap: PlannerResultView['roadmap'] }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Roadmap</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {roadmap.map((window) => (
          <div key={window.window} className="rounded-md border border-border-light bg-bg-secondary p-3">
            <p className="text-xs font-bold uppercase tracking-[1.2px] text-accent">{window.window}</p>
            <ul className="mt-2 space-y-2">
              {window.steps.map((step) => (
                <li key={step} className="flex items-start gap-2 text-sm leading-[1.5] text-text-secondary">
                  <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-success" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReframeList({ items }: { items: PlannerResumeReframe[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold text-text-primary">Resume Reframe</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.before} className="rounded-md border border-border-light bg-bg-secondary p-3">
            <p className="text-sm text-text-tertiary">Before: {item.before}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">After: {item.after}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function RoleRecommendationCard({ recommendation }: { recommendation: PlannerRecommendedRole }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-light text-accent">
          <ToolGlyph kind="job" className="h-5 w-5" />
        </div>
        <Badge>{recommendation.match}% Match</Badge>
      </div>
      <h4 className="mt-3 text-lg font-semibold text-text-primary">{recommendation.title}</h4>
      <p className="mt-2 text-sm leading-[1.6] text-text-secondary">{recommendation.reason}</p>
    </Card>
  )
}

interface LockedPanelProps {
  onUpgrade?: () => void
}

export function LockedPanel({ onUpgrade }: LockedPanelProps) {
  return (
    <Card className="p-8 text-center shadow-panel">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-warning-light text-warning">
        <ToolGlyph kind="shield" className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-2xl font-bold text-text-primary">You&apos;ve used your free analyses</h3>
      <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.6] text-text-secondary">
        Upgrade to unlock unlimited reports, resume upload, full roadmap output, and resume reframing.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onUpgrade ? (
          <Button variant="primary" onClick={onUpgrade}>
            Upgrade to Pro - $7/mo
          </Button>
        ) : (
          <Link href="/pricing">
            <Button variant="primary">Upgrade to Pro - $7/mo</Button>
          </Link>
        )}
        <Link href="/pricing">
          <Button variant="outline">Get Lifetime - $49</Button>
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[13px] text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon className="h-3.5 w-3.5 text-success" />
          Cancel anytime
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon className="h-3.5 w-3.5 text-success" />
          Instant access
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon className="h-3.5 w-3.5 text-success" />
          Secure payment
        </span>
      </div>
    </Card>
  )
}

interface FAQAccordionProps {
  items: { question: string; answer: string }[]
  className?: string
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  return <BaseFAQAccordion items={items} className={className} />
}
