// Die Berechnungen einer Erfassungstabelle: anlegen, oeffnen, streichen.
import { useState } from 'react'
import { Gruppe } from '@/ui/werkbank/Gruppe'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Eintrag } from '@/ui/werkbank/Eintrag'
import { Link2, X } from '@/ui/zeichen'
import { coerceSpalten } from '../../blocks/tabelle/spalten'
import type { BlockNode } from '../../core/blocks/BlockData'
import { getBlockDefinition } from '../../core/blocks/blockRegistry'
import {
  berechnungenAus,
  berechnungAlsText,
  berechnungsMaengel,
  neueBerechnung,
  type Berechnung,
} from '../../core/data/berechnung'
import { quellenInReichweite } from '../../state/quellenOps'
import { useDataSources } from '../../state/useDataSources'
import { useEditor } from '../../state/useEditor'
import { useAbschnitt } from './abschnittStand'
import { BerechnungDialog, type Spaltenkopf } from './BerechnungDialog'

export function BerechnungSektion({ block }: { block: BlockNode }) {
  const [offen, schalte] = useAbschnitt('berechnungen')
  const [imFenster, setzeFenster] = useState<string | null>(null)
  const ed = useEditor()
  const bibliothek = useDataSources().list

  const prop = getBlockDefinition(block.type)?.rechenGruppen?.prop
  if (prop === undefined) return null

  const berechnungen = berechnungenAus(block.props[prop])
  const spalten: Spaltenkopf[] = coerceSpalten(block.props.spalten).map((s) => ({
    kennung: s.kennung,
    titel: s.titel,
    hatFormel: s.formel !== undefined,
  }))
  const quellen = quellenInReichweite(ed.tree, block.id, bibliothek)

  const titelVon = (kennung: string): string | null => {
    const s = spalten.find((sp) => sp.kennung === kennung)
    return s === undefined ? null : (s.titel === '' ? s.kennung : s.titel)
  }

  const setze = (liste: readonly Berechnung[]): void => {
    ed.updateProperty(block.id, prop, liste)
  }

  const lege = (): void => {
    const neu = neueBerechnung(berechnungen)
    setze([...berechnungen, neu])
    setzeFenster(neu.kennung)
  }

  const geoeffnet = berechnungen.find((b) => b.kennung === imFenster)

  return (
    <Gruppe
      titel="Berechnungen"
      offen={offen}
      onSchalte={schalte}
    >
      <div className="flex flex-col gap-2">
        <p className="text-dicht text-matt">
          Eine Berechnung verbindet mehrere Spalten zu einer Gleichung. Wer drei
          ihrer Größen ausfüllt, bekommt die vierte; wer die vierte überschreibt,
          macht sie wieder zu einer Eingabe.
        </p>

        {berechnungen.length === 0 && (
          <p className="text-dicht text-matt">Noch keine Berechnung.</p>
        )}

        {berechnungen.map((b) => {
          const maengel = berechnungsMaengel(
            b,
            titelVon,
            (feld) => (feld === '' ? null : feld),
            (kennung) => spalten.find((s) => s.kennung === kennung)?.hatFormel === true,
          )
          const formelText = berechnungAlsText(b, (k) => titelVon(k) ?? '?')
          return (
            <div key={b.kennung} className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <Eintrag
                  icon={Link2}
                  name={b.name}
                  aktiv={b.kennung === imFenster}
                  onClick={() => setzeFenster(b.kennung)}
                  unten={(
                    // Die Formel ist laenger als der Inspector breit; ganz steht
                    // sie im Tooltip und im Fenster.
                    <span
                      className={maengel.length > 0 ? 'block truncate text-fehler' : 'block truncate'}
                      title={formelText}
                    >{maengel.length > 0 ? maengel[0] : formelText}</span>
                  )}
                />
              </div>
              <Knopf
                nurZeichen
                aria-label={`Berechnung ${b.name} entfernen`}
                onClick={() => setze(berechnungen.filter((x) => x.kennung !== b.kennung))}
              >
                <X className="size-3.5" />
              </Knopf>
            </div>
          )
        })}

        <Knopf onClick={lege}>+ Berechnung</Knopf>
      </div>

      {geoeffnet !== undefined && (
        <BerechnungDialog
          berechnung={geoeffnet}
          spalten={spalten}
          quellen={quellen}
          onBerechnung={(neu) => setze(
            berechnungen.map((b) => (b.kennung === neu.kennung ? neu : b)),
          )}
          onClose={() => setzeFenster(null)}
        />
      )}
    </Gruppe>
  )
}
