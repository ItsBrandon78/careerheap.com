import { cookies } from 'next/headers'
import { LOCALE_COOKIE, makeTranslator, normalizeLocale, type Locale, type Translator } from './config'

/** Read the active locale from the request cookie (server components). */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies()
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value)
}

/** Convenience: locale + a bound t() for server components. */
export async function getServerT(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getServerLocale()
  return { locale, t: makeTranslator(locale) }
}
