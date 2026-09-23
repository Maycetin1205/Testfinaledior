/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        ground: 'hsl(var(--wb-ground) / <alpha-value>)',
        panel: 'hsl(var(--wb-panel) / <alpha-value>)',
        control: 'hsl(var(--wb-control) / <alpha-value>)',
        line: 'hsl(var(--wb-line) / <alpha-value>)',
        ink: 'hsl(var(--wb-ink) / <alpha-value>)',
        muted: 'hsl(var(--wb-muted) / <alpha-value>)',
        accent: 'hsl(var(--wb-accent) / <alpha-value>)',
        error: 'hsl(var(--wb-error) / <alpha-value>)',
        pending: 'hsl(var(--wb-pending) / <alpha-value>)',
      },
      fontSize: {
        ui: ['0.8125rem', { lineHeight: '1.25rem' }],
        dense: ['0.75rem', { lineHeight: '1rem' }],
        // Tailwind's own xs and sm land on the same two steps.
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        'ui-title': ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      spacing: {
        control: '1.75rem',
      },
      borderRadius: {
        // Every radius name resolves to the one editor radius, whichever a file writes.
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      boxShadow: {
        overlay: '0 0.5rem 1.5rem -0.5rem rgb(40 30 20 / 0.25)',
      },
    },
  },
  plugins: [],
}
