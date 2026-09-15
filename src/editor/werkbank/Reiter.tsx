// Eine Registerzunge: flach, die aktive traegt die Akzentflaeche.
import type { ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface ReiterProps {
  aktiv?: boolean
  title?: string
  onClick: () => void
  onDoubleClick?: () => void
  className?: string
  children: ReactNode
}

// Die aktive Zunge ist farbig UND fett: Farbe allein unterscheidet fuer manche
// Augen zu wenig. Feste Hoehe und nowrap halten die Leiste beim Wechsel ruhig.
// Kein aria-pressed: dieselbe Zunge dient auch als Aktion.
export function Reiter({
  aktiv = false,
  title,
  onClick,
  onDoubleClick,
  className,
  children,
}: ReiterProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'h-6 shrink-0 whitespace-nowrap rounded px-2.5 text-dicht transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        aktiv ? 'bg-akzent/15 font-medium text-tinte' : 'text-matt hover:text-tinte',
        className,
      )}
    >
      {children}
    </button>
  )
}
