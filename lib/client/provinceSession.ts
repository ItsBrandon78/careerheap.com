'use client'

export const PROVINCE_SESSION_KEY = 'ch_province'
export const PROVINCE_SESSION_COOKIE = 'ch_province'
export const DEFAULT_PROVINCE = 'ON'

export const CANADA_PROVINCES = [
  { code: 'ON', label: 'Ontario' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'AB', label: 'Alberta' },
  { code: 'SK', label: 'Saskatchewan' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'QC', label: 'Quebec' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'YT', label: 'Yukon' },
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' }
] as const

export type ProvinceCode = (typeof CANADA_PROVINCES)[number]['code']

function isProvinceCode(value: string): value is ProvinceCode {
  return CANADA_PROVINCES.some((province) => province.code === value)
}

function readProvinceCookie() {
  if (typeof document === 'undefined') return null
  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${PROVINCE_SESSION_COOKIE}=`))
  if (!entry) return null
  const value = decodeURIComponent(entry.split('=')[1] ?? '').trim().toUpperCase()
  return isProvinceCode(value) ? value : null
}

export function getProvinceLabel(code: string | null | undefined) {
  return (
    CANADA_PROVINCES.find((province) => province.code === code)?.label ??
    CANADA_PROVINCES.find((province) => province.code === DEFAULT_PROVINCE)?.label ??
    'Ontario'
  )
}

export function toProvinceLocation(code: string | null | undefined) {
  return `${getProvinceLabel(code)}, Canada`
}

export function getStoredProvince() {
  if (typeof window === 'undefined') return DEFAULT_PROVINCE

  const local = window.localStorage.getItem(PROVINCE_SESSION_KEY)?.trim().toUpperCase() ?? ''
  if (isProvinceCode(local)) return local

  const cookie = readProvinceCookie()
  if (cookie) return cookie

  return DEFAULT_PROVINCE
}

export function setStoredProvince(code: ProvinceCode) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(PROVINCE_SESSION_KEY, code)
  document.cookie = `${PROVINCE_SESSION_COOKIE}=${encodeURIComponent(code)}; path=/; samesite=lax`
  window.dispatchEvent(new CustomEvent('careerheap:province-changed', { detail: code }))
}
