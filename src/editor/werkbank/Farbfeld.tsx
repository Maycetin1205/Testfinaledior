// Ein Farbfleck zum Anklicken; die gewaehlte Farbe traegt Ring und Haekchen.
import { Check } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'

export interface FarbfeldProps {
  // Die Farbe als fertiger CSS-Wert, nicht als Klasse: welche Farben zur Wahl
  // stehen, entscheidet die Maske. Fehlt sie, bleibt das Feld leer.
  farbe?: string

  // Der Klarname der Farbe. Pflicht, denn zu sehen ist nur ein Fleck.
  name: string

  gewaehlt: boolean
  onWaehle: () => void
}

// Das Haekchen sagt unabhaengig von der Farbe, welche Kachel gemeint ist: bei
// dunklen Farben ist der Ring kaum zu sehen.
export function Farbfeld({ farbe, name, gewaehlt, onWaehle }: FarbfeldProps) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={gewaehlt}
      title={name}
      onClick={onWaehle}
      style={{ backgroundColor: farbe }}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded border border-linie',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent focus-visible:ring-offset-1',
        gewaehlt
          ? 'ring-1 ring-akzent ring-offset-1'
          : 'hover:ring-1 hover:ring-matt hover:ring-offset-1',
      )}
    >
      {gewaehlt && <Check size={13} strokeWidth={3} className="text-grund" />}
    </button>
  )
}
