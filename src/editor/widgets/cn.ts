import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The names tailwind.config.js adds. Unknown, `text-label` would pass for a
// color and fall away beside `text-muted`, and `h-control` would stay beside
// an `h-6` that a caller writes on top of it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ['control'],
      tracking: ['label'],
    },
    classGroups: {
      'font-size': [{ text: ['ui', 'ui-title', 'dense', 'label', 'title'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
