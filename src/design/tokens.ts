export const tokens = {
  colors: {
    accent: '#245DFF',
    'accent-hover': '#1E4ED9',
    'accent-light': '#EAF0FF',
    'accent-secondary': '#0EA5A4',
    primary: '#101B31',
    'primary-light': '#1A2A48',
    surface: '#FFFFFF',
    'bg-primary': '#F8FAFF',
    'bg-secondary': '#F0F4FB',
    'bg-dark': '#0A1324',
    'bg-dark-surface': '#111F39',
    'text-primary': '#0B1425',
    'text-secondary': '#41516B',
    'text-tertiary': '#7F8DA3',
    'text-on-dark': '#FFFFFF',
    'text-on-dark-muted': '#A5B2C7',
    border: '#D9E2F0',
    'border-light': '#EAF0FA',
    'focus-ring': '#7EA0FF',
    success: '#0F9F77',
    warning: '#CE860F',
    error: '#D6454B',
    'success-light': '#E8F8F2',
    'warning-light': '#FFF7E8',
    'error-light': '#FDECEE'
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
    sm: '8px',
    md: '10px',
    lg: '14px',
    pill: '100px'
  },
  shadows: {
    button: '0 8px 20px rgba(36,93,255,0.22)',
    card: '0 6px 20px rgba(12,20,37,0.06)',
    panel: '0 12px 36px rgba(12,20,37,0.10)'
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
