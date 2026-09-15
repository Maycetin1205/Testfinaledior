// Eine zuklappbare Gruppe mit Kopfzeile.
import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'

export interface GruppeProps {
  titel: ReactNode

  // Rechts im Kopf. Klicks darin klappen die Gruppe nicht auf.
  aktionen?: ReactNode

  // Ohne `offen` fuehrt die Gruppe ihren Zustand selbst.
  offen?: boolean
  standardOffen?: boolean
  onSchalte?: (offen: boolean) => void
  className?: string
  children: ReactNode
}

export function Gruppe({
  titel,
  aktionen,
  offen,
  standardOffen = true,
  onSchalte,
  className,
  children,
}: GruppeProps) {
  const id = useId()
  const [eigen, setEigen] = useState(standardOffen)
  const auf = offen ?? eigen

  const schalte = () => {
    if (onSchalte) onSchalte(!auf)
    else setEigen(!auf)
  }

  return (
    <section className={cn('flex min-w-0 flex-col', className)}>
      {/* Die Ueberschrift traegt die Trennlinie selbst. Stuende sie klein,
          grau und in Grossbuchstaben ueber Inhalt, der GROESSER ist als sie,
          stuende die Rangfolge auf dem Kopf; trennte zusaetzlich ein eigener
          Trenner-Strich die Abschnitte, waeren das zwei Trennsysteme
          nebeneinander, mit unterschiedlichen Abstaenden je nachdem, welche
          Kombination gerade zutrifft. */}
      <div className="flex h-steuer items-center gap-1 border-b border-linie">
        <button
          type="button"
          aria-expanded={auf}
          aria-controls={id}
          onClick={schalte}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded text-left',
            'text-ui font-semibold text-tinte',
            'transition-colors hover:text-akzent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
          )}
        >
          <span className="min-w-0 flex-1 truncate">{titel}</span>
          <ChevronDown
            size={12}
            aria-hidden
            className={cn('shrink-0 text-matt transition-transform', !auf && '-rotate-90')}
          />
        </button>
        {aktionen && <div className="flex shrink-0 items-center gap-1">{aktionen}</div>}
      </div>
      {auf && (
        <div id={id} className="flex min-w-0 flex-col gap-2 pt-2">
          {children}
        </div>
      )}
    </section>
  )
}
