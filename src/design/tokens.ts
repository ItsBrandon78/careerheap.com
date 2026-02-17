export const tokens = {
  colors: {
    accent: '#2563EB',
    'accent-hover': '#1D4ED8',
    'accent-light': '#EFF6FF',
    primary: '#1E293B',
    'primary-light': '#334155',
    surface: '#FFFFFF',
    'bg-primary': '#FFFFFF',
    'bg-secondary': '#F8FAFC',
    'bg-dark': '#0F172A',
    'bg-dark-surface': '#1E293B',
    'text-primary': '#0F172A',
    'text-secondary': '#475569',
    'text-tertiary': '#94A3B8',
    'text-on-dark': '#FFFFFF',
    'text-on-dark-muted': '#94A3B8',
    border: '#E2E8F0',
    'border-light': '#F1F5F9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    'success-light': '#ECFDF5',
    'warning-light': '#FFFBEB',
    'error-light': '#FEF2F2'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    section: '96px'
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    pill: '100px'
  },
  shadows: {
    button: '0 2px 8px rgba(37,99,235,0.30)',
    card: '0 2px 12px rgba(15,23,42,0.03)',
    panel: '0 4px 24px rgba(15,23,42,0.04)'
  },
  container: {
    content: '1100px',
    wide: '1280px',
    tool: '760px'
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  },
  typography: {
    fontBody: 'Inter',
    fontHeading: 'Inter'
  }
} as const

export type Tokens = typeof tokens

export const { colors, spacing, radius, shadows, container, breakpoints, typography } = tokens

export default tokens
