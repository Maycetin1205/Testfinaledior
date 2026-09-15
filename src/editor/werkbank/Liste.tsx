// Eine waehlbare Liste mit Klarnamen, Kennung und optionaler Suche.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { Marke } from './Marke'

export interface ListeEintrag {
  wert: string
  name: string

  kennung?: string
  deaktiviert?: boolean
}

export interface ListeGruppe {
  key: string
  name?: string
  kennung?: string
  hinweis?: string
  eintraege: readonly ListeEintrag[]
}

export interface ListeProps {
  gruppen: readonly ListeGruppe[]
  wert: string

  // Erste Zeile fuer „nichts gewaehlt". Fehlt sie, ist die Wahl Pflicht.
  leerText?: string
  leerHinweis?: string

  // Suchfeld ueber der Liste. Eine Datenquelle kann hunderte Felder haben.
  suchbar?: boolean
  onWaehle: (wert: string) => void
}

const ZEILE = 'flex w-full items-baseline gap-3 rounded px-2 py-1 text-left text-ui transition-colors'

function passt(text: string, suche: string): boolean {
  return text.toLowerCase().includes(suche)
}

export function Liste({
  gruppen,
  wert,
  leerText,
  leerHinweis,
  suchbar = false,
  onWaehle,
}: ListeProps) {
  const [suche, setSuche] = useState('')
  const sucheRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (suchbar) sucheRef.current?.focus()
  }, [suchbar])

  const gesucht = suche.trim().toLowerCase()

  const gefiltert = useMemo(() => {
    if (gesucht === '') return gruppen
    return gruppen
      .map((g) => ({
        ...g,
        eintraege: g.eintraege.filter((e) => passt(e.name, gesucht) || passt(e.kennung ?? '', gesucht)),
      }))
      .filter((g) => g.eintraege.length > 0)
  }, [gruppen, gesucht])

  const leer = gefiltert.every((g) => g.eintraege.length === 0)

  return (
    <div className="flex flex-col">
      {suchbar && (
        <div className="flex items-center gap-1.5 border-b border-linie px-2 py-1">
          <Search size={13} aria-hidden className="shrink-0 text-matt" />
          <input
            ref={sucheRef}
            value={suche}
            onChange={(e) => setSuche(e.currentTarget.value)}
            placeholder="Suchen…"
            aria-label="Suchen"
            className="h-steuer min-w-0 flex-1 bg-transparent text-ui text-tinte outline-none placeholder:text-matt"
          />
        </div>
      )}

      {leerText !== undefined && gesucht === '' && (
        <button
          type="button"
          onClick={() => onWaehle('')}
          className={cn(ZEILE, 'text-matt hover:bg-control hover:text-tinte',
            wert === '' && 'font-medium text-tinte')}
        >
          <span className="w-3 shrink-0">{wert === '' && <Check size={12} />}</span>
          <span className="min-w-0 flex-1 truncate">{leerText}</span>
        </button>
      )}

      {gefiltert.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.name !== undefined && g.name !== '' && (
            <p className="flex items-baseline gap-2 px-2 pb-0.5 pt-1.5 text-dicht font-semibold uppercase tracking-wide text-matt">
              <span className="min-w-0 truncate">{g.name}</span>
              {g.kennung !== undefined && g.kennung !== '' && (
                <Marke className="font-normal normal-case tracking-normal">{g.kennung}</Marke>
              )}
            </p>
          )}
          {g.hinweis !== undefined && g.hinweis !== '' && (
            <p className="px-2 pb-1 text-dicht text-matt">{g.hinweis}</p>
          )}
          {g.eintraege.map((e) => {
            const gewaehlt = e.wert === wert
            return (
              <button
                key={`${g.key}::${e.wert}`}
                type="button"
                disabled={e.deaktiviert}

          // Abgeschnittener Text ist ohne Tooltip nicht mehr lesbar.
                title={e.kennung === undefined || e.kennung === ''
                  ? e.name
                  : `${e.name} — ${e.kennung}`}
                onClick={() => onWaehle(e.wert)}
                className={cn(
                  ZEILE,
                  e.deaktiviert
                    ? 'cursor-not-allowed text-matt opacity-50'
                    : 'text-tinte hover:bg-control',
                  gewaehlt && 'bg-akzent/15 font-medium',
                )}
              >
                <span className="w-3 shrink-0 text-akzent">
                  {gewaehlt && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {e.kennung !== undefined && e.kennung !== '' && (
                  <Marke className="max-w-[50%]">{e.kennung}</Marke>
                )}
              </button>
            )
          })}
        </div>
      ))}

      {leer && (leerText === undefined || gesucht !== '') && (
        <p className="px-2 py-2 text-ui text-matt">
          {gesucht === '' ? (leerHinweis ?? 'Nichts zur Auswahl.') : 'Kein Treffer.'}
        </p>
      )}
    </div>
  )
}
