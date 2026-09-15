// Ein natives Auswahlfeld mit Klarname und Kennung.
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { EINGABE_KANTE } from './Feld'

export interface WahlOption {
  wert: string
  name: string

  kennung?: string
  deaktiviert?: boolean
}

export interface WahlProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'> {
  optionen: readonly WahlOption[]
  wert: string

  // Sichtbar, solange nichts gewaehlt ist. Fehlt er, ist die Wahl Pflicht.
  leerText?: string
  onWaehle: (wert: string) => void
}

// Ein natives <select>: Tastatur, Vorlesehilfe und Systemliste ohne eine Zeile
// Fensterlogik. Wo gesucht werden muss, sind Popover und Liste das richtige Ding.
export const Wahl = forwardRef<HTMLSelectElement, WahlProps>(
  ({ optionen, wert, leerText, onWaehle, className, ...rest }, ref) => {
    const unbekannt = wert !== '' && !optionen.some((o) => o.wert === wert)
    // Die Breite gehoert dem Rahmen, nicht dem <select>: sonst stand der Pfeil
    // am Ende einer vollen Zeile, waehrend das Feld schmal blieb, und der Rahmen
    // nahm den Nachbarn in der Reihe den Platz.
    return (
      <span className={cn('relative inline-flex min-w-0 items-center', className ?? 'w-full')}>
        <select
          ref={ref}
          value={wert}
          onChange={(e) => onWaehle(e.currentTarget.value)}
          className={cn(
            EINGABE_KANTE,
            'h-steuer cursor-pointer appearance-none py-0 pl-2 pr-7',
            unbekannt && 'text-fehler',
          )}
          {...rest}
        >
          {leerText !== undefined && <option value="">{leerText}</option>}
          {/* Ein Wert, den die Liste nicht kennt, verschwindet im nativen
              <select> lautlos. Er bleibt hier stehen und faellt rot auf. */}
          {unbekannt && <option value={wert}>{wert}</option>}
          {optionen.map((o) => (
            <option key={o.wert} value={o.wert} disabled={o.deaktiviert}>
              {o.kennung === undefined || o.kennung === '' ? o.name : `${o.name} — ${o.kennung}`}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          aria-hidden
          className="pointer-events-none absolute right-2 text-matt"
        />
      </span>
    )
  },
)
Wahl.displayName = 'Wahl'
