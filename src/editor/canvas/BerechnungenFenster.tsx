// Das Fenster fuer die Berechnungen einer Erfassung: die Liste und die
// Einstellung der gewaehlten in EINEM Fenster, statt eines Abschnitts im
// ohnehin vollen Inspector.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Dialog } from '@/ui/werkbank/Dialog'
import { Knopf } from '@/ui/werkbank/Knopf'
import { coerceSpalten } from '../../blocks/tabelle/spalten'
import { bausteinArt } from '../../core/blocks/blockRegistry'
import { faehigkeit } from '../../core/blocks/faehigkeiten'
import { berechnungenAus, neueBerechnung, type Berechnung } from '../../core/data/berechnung'
import { quellenInReichweite } from '../../state/quellenOps'
import { useDataSources } from '../../state/useDataSources'
import { useEditor } from '../../state/useEditor'
import { BerechnungDialog, type Spaltenkopf } from '../inspector/BerechnungDialog'
import {
  beiBerechnungenWechsel,
  offenesBerechnungenFenster,
  schliesseBerechnungenFenster,
} from './berechnungenStand'

export function BerechnungenFenster() {
  const blockId = useSyncExternalStore(beiBerechnungenWechsel, offenesBerechnungenFenster)
  if (blockId === null) return null
  // Ein anderer Baustein ist eine andere Sache: frische Wahl.
  return <Fenster key={blockId} blockId={blockId} />
}

function Fenster({ blockId }: { blockId: string }) {
  const ed = useEditor()
  const bibliothek = useDataSources().list
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  const block = ed.getNode(blockId)
  const prop = block === undefined ? undefined : faehigkeit(bausteinArt(block.type), 'rechnen')?.prop

  // Ist der Baustein weg (Loeschen, Undo), geht das Fenster mit.
  useEffect(() => {
    if (block === undefined || prop === undefined) schliesseBerechnungenFenster()
  }, [block, prop])
  if (block === undefined || prop === undefined) return null

  const berechnungen = berechnungenAus(block.props[prop])
  const spalten: Spaltenkopf[] = coerceSpalten(block.props.spalten).map((s) => ({
    kennung: s.kennung,
    titel: s.titel,
  }))
  const quellen = quellenInReichweite(ed.tree, block.id, bibliothek)

  const setze = (liste: readonly Berechnung[]): void => {
    ed.updateProperty(block.id, prop, liste)
  }
  const lege = (): void => {
    const neu = neueBerechnung(berechnungen)
    setze([...berechnungen, neu])
    setGewaehlt(neu.kennung)
  }
  const schliesse = (): void => schliesseBerechnungenFenster()

  const aktuelle = berechnungen.find((b) => b.kennung === gewaehlt) ?? berechnungen[0]
  if (aktuelle === undefined) {
    return (
      <Dialog
        titel="Berechnungen"
        schmal
        fuss={<Knopf art="primaer" onClick={schliesse}>Fertig</Knopf>}
        onClose={schliesse}
      >
        <div className="flex flex-col gap-3">
          <p className="text-ui text-matt">
            Noch keine Berechnung an dieser Erfassung. Eine Berechnung verbindet
            mehrere Spalten zu einer Gleichung: wer drei ihrer Größen ausfüllt,
            bekommt die vierte.
          </p>
          <Knopf art="primaer" className="self-start" onClick={lege}>+ Berechnung</Knopf>
        </div>
      </Dialog>
    )
  }

  return (
    // Ein Wechsel der Berechnung ist ein frisches Fenster: Name und Pruefwerte
    // haengen sonst an der vorigen.
    <BerechnungDialog
      key={aktuelle.kennung}
      berechnung={aktuelle}
      spalten={spalten}
      quellen={quellen}
      liste={{
        berechnungen,
        onWaehle: setGewaehlt,
        onNeu: lege,
        onWeg: () => {
          setze(berechnungen.filter((b) => b.kennung !== aktuelle.kennung))
          setGewaehlt(null)
        },
      }}
      onBerechnung={(neu) => setze(
        berechnungen.map((b) => (b.kennung === neu.kennung ? neu : b)),
      )}
      onClose={schliesse}
    />
  )
}
