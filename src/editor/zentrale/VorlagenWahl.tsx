// Womit eine neue Datenquelle anfaengt: suchen statt aus neun Arten raten.
import { useMemo, useState } from 'react'
import { Search } from '@/editor/zeichen/zeichen'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import {
  artFuer,
  QUELLEN_ARTEN,
  tabellenKennungNoetig,
  type QuellenArtKennung,
} from '../../kern/daten/datenquellen'
import { quellenWorte } from './beschriftungen'
import { ikonFuer } from './helfer'
import { passt } from './vorlagenSuche'


// Was die Vorlage mitbringt, in Klartext — sonst weiss der Bediener erst nach
// dem Klick, was er bekommt.
function mitbringsel(kind: QuellenArtKennung): string[] {
  const worte = quellenWorte(kind)
  const art = artFuer(kind)
  const teile: string[] = []
  if (worte.standardFelder.length > 0) teile.push(`${worte.standardFelder.length} Felder zum Start`)
  if (art.tabellenId !== '') teile.push(`Tabelle ${art.tabellenId}`)
  if (tabellenKennungNoetig(art)) teile.push(`Kennung nötig, z. B. ${worte.kennungBeispiel}`)
  if (art.kopfsatzStandard !== '') teile.push(`Kopfsatz ${art.kopfsatzStandard}`)
  if (!art.felderEinzeln) teile.push('bestellt den ganzen Satz')
  return teile
}

interface VorlagenWahlProps {
  onWaehle: (kind: QuellenArtKennung) => void
  onClose: () => void
}

export function VorlagenWahl({ onWaehle, onClose }: VorlagenWahlProps) {
  const [suche, setSuche] = useState('')
  const treffer = useMemo(
    () => QUELLEN_ARTEN.filter((a) => passt(a.id, suche)),
    [suche],
  )

  return (
    <div className="flex flex-col gap-3 text-ui">
      <div>
        <h3 className="text-ui font-semibold text-tinte">Neue Datenquelle</h3>
        <p className="text-matt">Woher kommen die Daten?</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-matt" />
        <Feld
          autoFocus
          value={suche}
          placeholder="Suchen — z. B. Position, Kunde, Artikel, IDB"
          className="pl-7"
          onChange={(e) => setSuche(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {treffer.map((a) => {
          const worte = quellenWorte(a.id)
          const Icon = ikonFuer(a.id)
          const bringt = mitbringsel(a.id)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onWaehle(a.id)}
              className="flex gap-2.5 rounded border border-linie bg-control px-3 py-2 text-left
                hover:border-akzent focus-visible:border-akzent focus-visible:outline-none"
            >
              <Icon size={15} className="mt-0.5 shrink-0 text-matt" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold text-tinte">{worte.name}</span>
                <span className="text-matt">{worte.beschreibung}</span>
                {bringt.length > 0 && (
                  <span className="text-dicht text-matt">{bringt.join(' · ')}</span>
                )}
              </span>
            </button>
          )
        })}
        {treffer.length === 0 && (
          <p className="text-matt">
            Nichts gefunden. Such nach dem, was die Daten sind — Beleg, Position,
            Kunde, Artikel, Datei —, nicht nach dem Namen der Quelle.
          </p>
        )}
      </div>

      <div className="border-t border-linie pt-3">
        <Knopf onClick={onClose}>Abbrechen</Knopf>
      </div>
    </div>
  )
}
