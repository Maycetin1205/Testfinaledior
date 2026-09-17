// Was eine Datenquelle bei SoftEngine bestellt, in Klartext.
import { Gruppe } from '@/editor/werkbank/Gruppe'
import {
  artFuer,
  bestellteFelder,
  holtSelbst,
  istOffenerSatz,
  kopfsatzVon,
  ladeRelationVon,
  tabellenIdVon,
  type Datenquelle,
} from '../../kern/daten/datenquellen'
import {
  benutzteFelderJeQuelle,
  collectDataSources,
  holSchluesselJeGeber,
} from '../../export/benutzteQuellen'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'

const BLOCK_NAME: Record<'sefileloop' | 'erpapicall' | 'dataset', string> = {
  sefileloop: 'SEFILELOOP',
  erpapicall: 'ERPAPICALL',
  dataset: 'DATASET',
}

function Zeile({ was, wert, matt }: { was: string; wert: string; matt?: boolean }) {
  return (
    <tr className="border-b border-linie last:border-b-0">
      <td className="px-2.5 py-1 text-matt">{was}</td>
      <td className={`px-2.5 py-1 text-right ${matt === true ? 'text-matt' : 'font-mono text-dicht'}`}>
        {wert}
      </td>
    </tr>
  )
}

// Gezaehlt wird, was WIRKLICH hinausgeht: dieselbe Rechnung wie im Export, damit
// im Datencenter nichts anderes steht als spaeter in der Maske.
export function Bestellung({ quelle }: { quelle: Datenquelle }) {
  const ed = useEditor()
  const alle = useDataSources().list

  const benutzt = collectDataSources(ed.tree, alle).some((s) => s.id === quelle.id)
  const felderJeQuelle = benutzteFelderJeQuelle(ed.tree, alle)
  const holSchluessel = holSchluesselJeGeber(ed.tree, alle)

  if (!benutzt) {
    return (
      <Gruppe titel="Was bei SoftEngine bestellt wird">
        <p className="text-matt">
          Nichts. Kein Baustein dieser Maske benutzt die Quelle, also steht sie
          nicht im Bestellzettel.
        </p>
      </Gruppe>
    )
  }

  const lade = ladeRelationVon(quelle)
  const art = artFuer(quelle.art)
  const bestellt = bestellteFelder(
    quelle, felderJeQuelle.get(quelle.id), holSchluessel.get(quelle.id) ?? [],
  )
  const kopfsatz = kopfsatzVon(quelle)

  const felderText = bestellt === '*'
    ? `ganzer Satz (*) — jedes Feld, das der Satz hat`
    : `${bestellt.split(',').filter((c) => c !== '').length} von ${quelle.felder.length}`

  const wann = holtSelbst(quelle)
    ? 'auf Nachfrage — kommt NICHT mit der Maske'
    : istOffenerSatz(quelle)
      ? 'beim Öffnen, im VAR-Abschnitt'
      : 'beim Öffnen der Maske'

  return (
    <Gruppe titel="Was bei SoftEngine bestellt wird">
      <div className="overflow-hidden rounded border border-linie">
        <table className="w-full">
          <tbody>
            <Zeile
              was="Block"
              wert={holtSelbst(quelle)
                ? `GET_RELATION ${lade?.nr ?? ''}`.trim()
                : istOffenerSatz(quelle) ? 'VAR' : BLOCK_NAME[art.bestellBlock]}
            />
            {tabellenIdVon(quelle) !== '' && (
              <Zeile was="Kennung" wert={tabellenIdVon(quelle)} />
            )}
            <Zeile was="Felder" wert={felderText} matt={bestellt === '*'} />
            {kopfsatz !== '' && (
              <Zeile
                was="Kopfsatz"
                wert={holtSelbst(quelle) ? `${kopfsatz} — ohne Wirkung` : kopfsatz}
                matt={holtSelbst(quelle)}
              />
            )}
            <Zeile was="Wann" wert={wann} matt />
          </tbody>
        </table>
      </div>
      {holtSelbst(quelle) && kopfsatz !== '' && (
        <p className="text-matt">
          Der Kopfsatz gilt nur für bestellte Quellen. Diese holt selbst, also
          bleibt er ohne Wirkung — eins von beidem ist zu viel.
        </p>
      )}
      {bestellt !== '*' && felderJeQuelle.get(quelle.id) === undefined && (
        <p className="text-matt">
          Kein Baustein liest ein einzelnes Feld, darum geht die ganze Liste
          hinaus. Wer Felder bindet, bestellt weniger.
        </p>
      )}
    </Gruppe>
  )
}
