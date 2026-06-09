'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_LOCALE, LOCALE_COOKIE, translate, type Locale, type Translator } from './config'

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translator
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  initialLocale,
  children
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      setLocaleState(next)
      try {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
        document.documentElement.lang = next
        window.localStorage.setItem(LOCALE_COOKIE, next)
      } catch {
        /* storage unavailable */
      }
      // Re-render server components (marketing pages) in the new language.
      router.refresh()
    },
    [locale, router]
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (en, fr) => translate(locale, en, fr) }),
    [locale, setLocale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (en) => en }
  }
  return ctx
}

export function useT(): Translator {
  return useLocale().t
}
