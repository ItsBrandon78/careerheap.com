/* eslint-disable @typescript-eslint/no-require-imports */
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
      padding: {
        DEFAULT: tokens.spacing.md,
        md: tokens.spacing.lg
      },
      screens: {
        lg: tokens.container.content,
        xl: tokens.container.wide
      }
    },
    extend: {
      colors: {
        ...tokens.colors
      },
      spacing: {
        ...tokens.spacing
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        pill: tokens.radius.pill
      },
      boxShadow: {
        ...tokens.shadows
      },
      fontFamily: {
        body: [tokens.typography.fontBody, 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: [tokens.typography.fontHeading, 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        content: tokens.container.content,
        wide: tokens.container.wide,
        tool: tokens.container.tool
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
