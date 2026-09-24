/** @type {import('tailwindcss').Config} */
// The design values stand in docs/chef-maske/empfang/index.basis.source.html;
// the comment names where.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      fontFamily: {
        // The chain of * in the mask: fonts of the machine, nothing is loaded.
        sans: [
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
        ink: 'hsl(var(--wb-ink) / <alpha-value>)',
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
        title: ['16px', { lineHeight: '1.45' }], // .vmodal-titel
      },
      letterSpacing: {
        label: '.04em', // .vfeld-label
      },
      spacing: {
        control: '28px', // .vdaynav .vbtn-icon, .vbtn-aktion
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
        overlay: '0 18px 60px rgba(16,40,48,.28)', // --schatten-pop
        focus: '0 0 0 3px color-mix(in oklab, hsl(var(--wb-accent)) 18%, transparent)', // .vinput:focus
      },
      transitionDuration: {
        DEFAULT: '120ms', // .vbtn
      },
    },
  },
  plugins: [],
}
