// Eine Zeile in einer der Listen des Datencenters.
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface EintragProps {
  // Das Zeichen ganz links. Gleiche Groesse in allen Listen, damit die Namen an
  // derselben Kante beginnen.
  icon: ComponentType<{ size?: number; className?: string }>

  name: string

  // Rechts neben dem Namen: Kennung, Warnzeichen, Zaehler. Was genau, weiss die
  // Liste.
  rechts?: ReactNode

  unten?: ReactNode
  aktiv?: boolean
  onClick: () => void
}

// Die Einrueckung der zweiten Zeile ist die Breite des Zeichens plus Abstand: so
// beginnt sie unter dem NAMEN und nicht unter dem Zeichen.
export function Eintrag({ icon: Icon, name, rechts, unten, aktiv = false, onClick }: EintragProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mb-1 w-full rounded border px-2.5 py-1 text-left text-dicht transition-colors',
        aktiv ? 'border-akzent/60 bg-akzent/15' : 'border-transparent hover:bg-control',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="shrink-0 text-matt" />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        {rechts}
      </div>
      {unten !== undefined && (
        <div className="mt-0.5 pl-[1.125rem] text-dicht text-matt">{unten}</div>
      )}
    </button>
  )
}
