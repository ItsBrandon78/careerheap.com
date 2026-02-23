export type AccessibilityTextSize = 'default' | 'large'
export type AccessibilityContrast = 'default' | 'high'
export type AccessibilityMotion = 'default' | 'reduced'
export type AccessibilityFocus = 'default' | 'enhanced'
export type AccessibilityLinks = 'default' | 'underlined'

export interface AccessibilityPreferences {
  textSize: AccessibilityTextSize
  contrast: AccessibilityContrast
  motion: AccessibilityMotion
  focus: AccessibilityFocus
  links: AccessibilityLinks
}

export const A11Y_STORAGE_KEY = 'careerheap_a11y_preferences'

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  textSize: 'default',
  contrast: 'default',
  motion: 'default',
  focus: 'default',
  links: 'default'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

export function normalizeAccessibilityPreferences(
  input: unknown,
  fallback: AccessibilityPreferences
): AccessibilityPreferences {
  if (!isObject(input)) {
    return fallback
  }

  return {
    textSize: isOneOf(input.textSize, ['default', 'large'])
      ? input.textSize
      : fallback.textSize,
    contrast: isOneOf(input.contrast, ['default', 'high'])
      ? input.contrast
      : fallback.contrast,
    motion: isOneOf(input.motion, ['default', 'reduced'])
      ? input.motion
      : fallback.motion,
    focus: isOneOf(input.focus, ['default', 'enhanced'])
      ? input.focus
      : fallback.focus,
    links: isOneOf(input.links, ['default', 'underlined'])
      ? input.links
      : fallback.links
  }
}

export function getSystemAccessibilityDefaults(win: Window): AccessibilityPreferences {
  const systemReducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches
  const systemHighContrast =
    win.matchMedia('(prefers-contrast: more)').matches ||
    win.matchMedia('(forced-colors: active)').matches

  return {
    ...defaultAccessibilityPreferences,
    motion: systemReducedMotion ? 'reduced' : 'default',
    contrast: systemHighContrast ? 'high' : 'default'
  }
}

export function readAccessibilityPreferences(
  win: Window
): AccessibilityPreferences {
  const systemDefaults = getSystemAccessibilityDefaults(win)

  try {
    const raw = win.localStorage.getItem(A11Y_STORAGE_KEY)
    if (!raw) {
      return systemDefaults
    }

    return normalizeAccessibilityPreferences(JSON.parse(raw), systemDefaults)
  } catch {
    return systemDefaults
  }
}

export function persistAccessibilityPreferences(
  win: Window,
  preferences: AccessibilityPreferences
) {
  try {
    win.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // no-op
  }
}

export function applyAccessibilityPreferences(
  doc: Document,
  preferences: AccessibilityPreferences
) {
  const root = doc.documentElement
  root.dataset.a11yTextSize = preferences.textSize
  root.dataset.a11yContrast = preferences.contrast
  root.dataset.a11yMotion = preferences.motion
  root.dataset.a11yFocus = preferences.focus
  root.dataset.a11yLinks = preferences.links
}

export const accessibilityInitScript = `
(() => {
  const KEY = '${A11Y_STORAGE_KEY}';
  const defaults = {
    textSize: 'default',
    contrast: window.matchMedia('(prefers-contrast: more)').matches || window.matchMedia('(forced-colors: active)').matches ? 'high' : 'default',
    motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'default',
    focus: 'default',
    links: 'default'
  };

  const normalize = (input, fallback) => {
    const value = input && typeof input === 'object' ? input : {};
    const pick = (key, options) => options.includes(value[key]) ? value[key] : fallback[key];
    return {
      textSize: pick('textSize', ['default', 'large']),
      contrast: pick('contrast', ['default', 'high']),
      motion: pick('motion', ['default', 'reduced']),
      focus: pick('focus', ['default', 'enhanced']),
      links: pick('links', ['default', 'underlined'])
    };
  };

  let prefs = defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      prefs = normalize(JSON.parse(raw), defaults);
    }
  } catch {}

  const root = document.documentElement;
  root.dataset.a11yTextSize = prefs.textSize;
  root.dataset.a11yContrast = prefs.contrast;
  root.dataset.a11yMotion = prefs.motion;
  root.dataset.a11yFocus = prefs.focus;
  root.dataset.a11yLinks = prefs.links;
})();
`
