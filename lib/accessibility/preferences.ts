export type AccessibilityTextSize = 'default' | 'large'
export type AccessibilityContrast = 'default' | 'high'
export type AccessibilityMotion = 'default' | 'reduced'
export type AccessibilityFocus = 'default' | 'enhanced'
export type AccessibilityLinks = 'default' | 'underlined'
export type AccessibilityTheme = 'system' | 'light' | 'dark'

export interface AccessibilityPreferences {
  theme: AccessibilityTheme
  textSize: AccessibilityTextSize
  contrast: AccessibilityContrast
  motion: AccessibilityMotion
  focus: AccessibilityFocus
  links: AccessibilityLinks
}

export const A11Y_STORAGE_KEY = 'careerheap_a11y_preferences'

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  theme: 'system',
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
    theme: isOneOf(input.theme, ['system', 'light', 'dark'])
      ? input.theme
      : fallback.theme,
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
    theme: 'system',
    motion: systemReducedMotion ? 'reduced' : 'default',
    contrast: systemHighContrast ? 'high' : 'default'
  }
}

function resolveThemePreference(preference: AccessibilityTheme, win?: Window) {
  if (preference === 'light' || preference === 'dark') return preference
  if (win?.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
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
  preferences: AccessibilityPreferences,
  win?: Window
) {
  const root = doc.documentElement
  const resolvedTheme = resolveThemePreference(preferences.theme, win)
  root.dataset.theme = resolvedTheme
  root.dataset.a11yTheme = preferences.theme
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
    theme: 'system',
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
      theme: pick('theme', ['system', 'light', 'dark']),
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
  const resolvedTheme = prefs.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.theme;
  root.dataset.theme = resolvedTheme;
  root.dataset.a11yTheme = prefs.theme;
  root.dataset.a11yTextSize = prefs.textSize;
  root.dataset.a11yContrast = prefs.contrast;
  root.dataset.a11yMotion = prefs.motion;
  root.dataset.a11yFocus = prefs.focus;
  root.dataset.a11yLinks = prefs.links;
})();
`
