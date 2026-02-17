const tokens = require('./src/design/tokens.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: tokens.spacing.md,
      screens: {
        lg: tokens.spacing.container
      }
    },
    extend: {
      colors: {
        primary: tokens.colors.primary,
        'primary-600': tokens.colors['primary-600'],
        muted: tokens.colors.muted,
        'bg-light': tokens.colors['bg-light'],
        surface: tokens.colors.surface,
        navy: tokens.colors.navy,
        accent: tokens.colors.accent
      },
      spacing: {
        xs: tokens.spacing.xs,
        sm: tokens.spacing.sm,
        md: tokens.spacing.md,
        lg: tokens.spacing.lg,
        xl: tokens.spacing.xl
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        pill: tokens.radius.pill
      },
      boxShadow: {
        sm: tokens.shadows.sm,
        md: tokens.shadows.md,
        lg: tokens.shadows.lg
      },
      fontSize: {
        base: tokens.fontSizes.base,
        lg: tokens.fontSizes.lg,
        xl: tokens.fontSizes.xl,
        '2xl': tokens.fontSizes['2xl'],
        '3xl': tokens.fontSizes['3xl']
      },
      screens: {
        sm: tokens.breakpoints.sm,
        md: tokens.breakpoints.md,
        lg: tokens.breakpoints.lg,
        xl: tokens.breakpoints.xl
      }
    }
  },
  plugins: []
}
