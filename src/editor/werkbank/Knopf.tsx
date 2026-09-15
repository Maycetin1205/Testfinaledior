// Der Knopf der Werkbank, in seinen Arten und Groessen.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export type KnopfArt = 'primaer' | 'still' | 'gefahr'

const FLAECHE: Record<KnopfArt, string> = {
  primaer: 'bg-akzent font-medium text-grund hover:bg-akzent/85',
  still: 'border border-linie bg-control text-tinte hover:border-matt',
  gefahr: 'border border-fehler/60 text-fehler hover:bg-fehler/15',
}

// Ein Symbolknopf traegt keine eigene Flaeche, sonst stehen in einer
// Werkzeugleiste zehn Kaesten nebeneinander.
const NUR_ZEICHEN: Record<KnopfArt, string> = {
  primaer: 'bg-akzent text-grund hover:bg-akzent/85',
  still: 'text-matt hover:bg-control hover:text-tinte',
  gefahr: 'text-matt hover:bg-fehler/15 hover:text-fehler',
}

interface KnopfBasis extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  art?: KnopfArt
  children: ReactNode
}

// Ein Knopf ohne Beschriftung braucht einen Namen fuer die Vorlesehilfe; das
// erzwingt der Typ.
export type KnopfProps =
  & KnopfBasis
  & ({ nurZeichen: true; 'aria-label': string } | { nurZeichen?: false })

export const Knopf = forwardRef<HTMLButtonElement, KnopfProps>(
  ({ art = 'still', nurZeichen = false, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-steuer shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded text-ui',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        'disabled:pointer-events-none disabled:opacity-40',
        nurZeichen ? `w-steuer ${NUR_ZEICHEN[art]}` : `px-2.5 ${FLAECHE[art]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Knopf.displayName = 'Knopf'
