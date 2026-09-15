// Eine Zeile in einem Popover: Menuepunkt der Werkzeugleiste wie Feld-Zeile des Waehlers.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export type MenueZeileArt = 'still' | 'gefahr'

const ART: Record<MenueZeileArt, { farbe: string; schweben: string }> = {
  still: { farbe: 'text-tinte', schweben: 'hover:bg-control' },
  gefahr: { farbe: 'text-fehler', schweben: 'hover:bg-fehler/15' },
}

export interface MenueZeileProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  zeichen?: ReactNode

  aktiv?: boolean
  art?: MenueZeileArt
  children: ReactNode
}

// Ihre Rolle bekommt die Zeile vom Aufrufer (role="menuitem" im Menue,
// aria-pressed in der Wahl): zu sehen ist dasselbe, fuer die Vorlesehilfe nicht.
export function MenueZeile({
  zeichen,
  aktiv = false,
  art = 'still',
  className,
  children,
  type = 'button',
  ...rest
}: MenueZeileProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex h-steuer w-full min-w-0 items-center gap-2 rounded px-2 text-left text-ui',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        'disabled:pointer-events-none disabled:opacity-40',
        ART[art].farbe,
        aktiv ? 'bg-akzent/15' : ART[art].schweben,
        className,
      )}
      {...rest}
    >
      {zeichen}
      {children}
    </button>
  )
}
