// Ein Umschalter fuer Ja/Nein.
import { cn } from '@/editor/werkbank/cn'

export interface SchalterProps {
  an: boolean

  // Fehlt sie, braucht der Schalter ein `bezeichnung` fuer die Vorlesehilfe.
  beschriftung?: string
  bezeichnung?: string
  hinweis?: string
  id?: string
  deaktiviert?: boolean
  onSchalte: (an: boolean) => void
}

export function Schalter({
  an,
  beschriftung,
  bezeichnung,
  hinweis,
  id,
  deaktiviert = false,
  onSchalte,
}: SchalterProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={an}
        aria-label={beschriftung === undefined ? bezeichnung : undefined}
        title={hinweis}
        disabled={deaktiviert}
        onClick={() => onSchalte(!an)}
        className={cn(
          'relative h-4 w-7 shrink-0 rounded border transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
          'disabled:pointer-events-none disabled:opacity-40',
          an ? 'border-akzent bg-akzent' : 'border-linie bg-control',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 h-2.5 w-2.5 rounded-[1px] transition-all',
            an ? 'left-3.5 bg-grund' : 'left-0.5 bg-matt',
          )}
        />
      </button>
      {beschriftung !== undefined && (
        <span className="min-w-0 truncate text-ui text-tinte">{beschriftung}</span>
      )}
    </span>
  )
}
