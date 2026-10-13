/** @type {import('tailwindcss').Config} */
// The design values: font, colors, control, radius and shadows are the
// mask's, from src/design/mask.css (sample docs/design/behandlung-modern.html);
// the sizes of text still stand in docs/chef-maske/empfang/index.basis.source.html.
// The comment names where.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      fontFamily: {
        // The chain of --se-font: Manrope from the @font-face in mask.css,
        // which main.tsx loads, then the fonts of the machine.
        sans: [
          '"Manrope"',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          'system-ui',
          'Arial',
          'sans-serif',
        ],
        mono: ['"Consolas"', 'monospace'], // .num
      },
      colors: {
        ground: 'hsl(var(--wb-ground) / <alpha-value>)',
        panel: 'hsl(var(--wb-panel) / <alpha-value>)',
        control: 'hsl(var(--wb-control) / <alpha-value>)',
        line: 'hsl(var(--wb-line) / <alpha-value>)',
        'line-soft': 'hsl(var(--wb-line-soft) / <alpha-value>)',
        'box-line': 'hsl(var(--wb-box-line) / <alpha-value>)',
        hover: 'hsl(var(--wb-hover) / <alpha-value>)',
        ink: 'hsl(var(--wb-ink) / <alpha-value>)',
        'ink-2': 'hsl(var(--wb-ink-2) / <alpha-value>)',
        muted: 'hsl(var(--wb-muted) / <alpha-value>)',
        accent: 'hsl(var(--wb-accent) / <alpha-value>)',
        'accent-soft': 'hsl(var(--wb-accent-soft) / <alpha-value>)',
        'accent-ink': 'hsl(var(--wb-accent-ink) / <alpha-value>)',
        error: 'hsl(var(--wb-error) / <alpha-value>)',
        'error-soft': 'hsl(var(--wb-error-soft) / <alpha-value>)',
        pending: 'hsl(var(--wb-pending) / <alpha-value>)',
        'pending-soft': 'hsl(var(--wb-pending-soft) / <alpha-value>)',
      },
      // Pixels, not rem, with the line height of html, body.
      fontSize: {
        ui: ['13px', { lineHeight: '1.45' }], // .kinput
        dense: ['12px', { lineHeight: '1.45' }], // .vkarte-meta
        // Tailwind's own xs and sm land on the same two steps.
        xs: ['12px', { lineHeight: '1.45' }],
        sm: ['13px', { lineHeight: '1.45' }],
        'ui-title': ['13px', { lineHeight: '1.45' }],
        label: ['11.5px', { lineHeight: '1.45' }], // .vfeld-label
        title: ['15px', { lineHeight: '1.45' }], // --se-fs-name, the head of a card
      },
      letterSpacing: {
        label: '.04em', // .vfeld-label
      },
      spacing: {
        control: '32px', // .tog of the sample
      },
      borderRadius: {
        // Every radius name resolves to the one editor radius, whichever a file writes.
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      boxShadow: {
        // The one shadow, for what floats: popover and dialog.
        overlay: '0 18px 50px hsl(var(--wb-ink) / .20), 0 2px 6px hsl(var(--wb-ink) / .08)', // --se-shadow-pop
        focus: '0 0 0 3px hsl(var(--wb-accent) / .20)', // --se-focus
        // The marked line of a list: a stroke on its left edge.
        mark: 'inset 3px 0 0 hsl(var(--wb-accent))',
        // A cell being typed in: a fine edge inside it.
        cell: 'inset 0 0 0 1px hsl(var(--wb-accent))',
      },
      transitionDuration: {
        DEFAULT: '140ms', // --se-move
      },
    },
  },
  plugins: [],
}
