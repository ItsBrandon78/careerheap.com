/* Lightweight bilingual (EN/FR) i18n, modeled on the prototype's
   t('English', 'Français') helper. Locale is persisted in a cookie so server
   components render in the right language; a client context keeps it reactive. */

export type Locale = 'en' | 'fr'

export const LOCALE_COOKIE = 'careerheap_lang'
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALES: Locale[] = ['en', 'fr']

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === 'fr' ? 'fr' : 'en'
}

/** Pick the French string when locale is fr (falling back to English). */
export function translate(locale: Locale, en: string, fr?: string): string {
  return locale === 'fr' && fr ? fr : en
}

export type Translator = (en: string, fr?: string) => string

export function makeTranslator(locale: Locale): Translator {
  return (en, fr) => translate(locale, en, fr)
}
