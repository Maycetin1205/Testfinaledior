// Der eine Waehler des Inspectors: Knopf plus suchbare Liste.
import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { EINGABE_KANTE } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Liste, type ListeGruppe } from '@/editor/werkbank/Liste'
import { Popover } from '@/editor/werkbank/Popover'
import { Zeile, type ZeileKind } from '@/editor/werkbank/Zeile'

export interface PickerControlProps {
  // Ohne Beschriftung steht der Waehler blank in einer Zeile (Feldpaare).
  label?: string
  hinweis?: string
  fehler?: ReactNode

  bezeichnung: string
  gruppen: readonly ListeGruppe[]
  wert: string

  // Zeile fuer „nichts gewaehlt". Fehlt sie, ist die Wahl Pflicht.
  leerText?: string
  platzhalter?: string
  className?: string
  onWaehle: (wert: string) => void
}

// `Wahl` (natives select) kann nicht suchen, und eine Datenquelle hat hunderte
// Felder. Also Popover und Liste, aber an EINER Stelle.
export function PickerControl({
  label,
  hinweis,
  fehler,
  bezeichnung,
  gruppen,
  wert,
  leerText,
  platzhalter = '— wählen —',
  className,
  onWaehle,
}: PickerControlProps) {
  const [offen, setOffen] = useState(false)
  const knopfRef = useRef<HTMLButtonElement | null>(null)

  const treffer = gruppen.flatMap((g) => g.eintraege).find((e) => e.wert === wert)

  // Ein Wert, den keine Gruppe kennt, faellt rot auf statt lautlos als „nichts
  // gewaehlt" zu erscheinen.
  const unbekannt = wert !== '' && treffer === undefined

  // Der geschlossene Knopf zeigt NUR den Klarnamen; die Kennung naehme sich bis
  // zur halben Breite. Sie steht in der Liste und im Tooltip.
  const gezeigt = unbekannt ? 'fehlt' : (treffer?.name ?? leerText ?? platzhalter)
  const tooltip = unbekannt
    ? `Nicht mehr vorhanden: ${wert}`
    : [treffer?.name, treffer?.kennung].filter((t) => t !== undefined && t !== '').join(' — ')

  const knopf = (kind?: ZeileKind) => (
    <Knopf
      ref={knopfRef}
      id={kind?.id}
      aria-describedby={kind?.['aria-describedby']}
      aria-invalid={kind?.['aria-invalid']}
      aria-haspopup="dialog"
      aria-expanded={offen}
      aria-label={label === undefined ? `${bezeichnung}: ${gezeigt}` : undefined}
      title={tooltip === '' ? (label === undefined ? bezeichnung : undefined) : tooltip}
      onClick={() => setOffen(!offen)}
      className={cn(EINGABE_KANTE, 'flex h-steuer items-center gap-2 px-2 text-left', className)}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          wert === '' && 'text-matt',
          unbekannt ? 'text-fehler' : wert !== '' && 'font-medium',
        )}
      >
        {gezeigt}
      </span>
      <ChevronDown size={13} aria-hidden className="shrink-0 text-matt" />
    </Knopf>
  )

  return (
    <>
      {label === undefined && fehler === undefined
        ? knopf()
        : <Zeile label={label} hinweis={hinweis} fehler={fehler}>{(kind) => knopf(kind)}</Zeile>}

      {offen && (
        <Popover
          bezeichnung={bezeichnung}
          anker={knopfRef}
          escapeAbfangen
          onClose={() => setOffen(false)}
        >
          <Liste
            suchbar
            gruppen={gruppen}
            wert={wert}
            leerText={leerText}
            onWaehle={(v) => {
              onWaehle(v)
              setOffen(false)
            }}
          />
        </Popover>
      )}
    </>
  )
}
