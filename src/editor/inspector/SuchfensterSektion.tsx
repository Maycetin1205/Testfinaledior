// Die Inspector-Bedienung der Faehigkeit Nachschlagen: das Suchfenster steht
// hier, an welchem Baustein es auch haengt.
import { Knopf } from '@/editor/werkbank/Knopf'
import { Gruppe } from '@/editor/werkbank/Gruppe'
import type { Baustein } from '../../kern/maske/baum'
import { eigenschaftSichtbar, type Eigenschaft } from '../../kern/maske/eigenschaft'
import type { SuchFenster } from '../../kern/maske/faehigkeiten'
import { bausteinArt } from '../../kern/maske/registry'
import {
  bausteinElementImEditor,
  fensterStandVon,
  oeffneFensterImEditor,
  type FensterStand,
} from '../canvas/fensterStand'
import { useEditor } from '../zustand/useEditor'
import { useAbschnitt } from './abschnittStand'
import { NumberControl } from './controls/NumberControl'

const BREITE: Eigenschaft = {
  schluessel: 'fensterBreite',
  name: 'Breite',
  beschreibung: 'Breite des Suchfensters in Pixeln.',
  art: 'number',
  einheit: 'px',
  min: 240,
  max: 1400,
}

const HOEHE: Eigenschaft = { ...BREITE, schluessel: 'fensterHoehe', name: 'Höhe', min: 160, max: 1000 }

interface SuchfensterSektionProps {
  block: Baustein
  fenster: SuchFenster
}

// Ein Fenster am Baustein selbst, oder je Eintrag mit Hilfsquelle eines.
function plaetzeVon(block: Baustein, fenster: SuchFenster): number[] {
  if (fenster.eintraegeProp === undefined) return [0]
  const roh = block.werte[fenster.eintraegeProp]
  return Array.isArray(roh) ? roh.map((_, i) => i) : []
}

export function SuchfensterSektion({ block, fenster }: SuchfensterSektionProps) {
  const [offen, schalte] = useAbschnitt('suchfenster')
  const ed = useEditor()

  // Ein getipptes Mass ist EIN Undo-Schritt, nicht einer je Ziffer.
  const sitzung = {
    onBeginBearbeitung: () => ed.beginTransaction(),
    onEndeBearbeitung: () => ed.endTransaction(),
  }

  if (!eigenschaftSichtbar(fenster.wenn, block.werte)) return null

  const staende = plaetzeVon(block, fenster)
    .map((platz) => ({ platz, stand: fensterStandVon(ed, block.id, fenster, platz) }))
    .filter((f): f is { platz: number; stand: FensterStand } => f.stand !== null)

  const oeffne = (platz: number): void => {
    const el = bausteinElementImEditor(block.id, bausteinArt(block.typ)?.tag ?? '')
    if (el !== null) oeffneFensterImEditor(ed, el, block.id, fenster, platz)
  }

  return (
    <Gruppe titel="Suchfenster" offen={offen} onSchalte={schalte}>
      {staende.length === 0 && (
        <p className="text-dicht text-matt">
          Noch kein Fenster: erst eine Quelle für das Nachschlagen wählen.
        </p>
      )}
      {staende.map(({ platz, stand }) => (
        <div key={platz} className="flex min-w-0 flex-col gap-1">
          {fenster.eintraegeProp !== undefined && (
            <p className="text-ui font-medium text-tinte">{stand.titel}</p>
          )}
          <p className="text-dicht text-matt">
            {stand.gestellt ? 'Spalten: ' : 'Automatisch: '}
            {stand.spalten.map((s) => (s.titel === '' ? s.feld : s.titel)).join(', ')}
          </p>
          {!stand.gestellt && <p className="text-dicht text-matt">{fenster.automatik}</p>}
          <div className="flex flex-wrap items-end gap-2">
            <NumberControl
              label="Breite"
              property={BREITE}
              value={stand.breite}
              onChange={(v) => stand.setzeMass('breite', v)}
              {...sitzung}
            />
            <NumberControl
              label="Höhe"
              property={HOEHE}
              value={stand.hoehe}
              onChange={(v) => stand.setzeMass('hoehe', v)}
              {...sitzung}
            />
            {/* Die Spalten werden IM Fenster eingestellt, an ihren Koepfen. Der
                Knopf ist der Weg dorthin, die Lupe am Baustein der zweite. */}
            <Knopf onClick={() => oeffne(platz)}>Spalten im Fenster…</Knopf>
          </div>
        </div>
      ))}
    </Gruppe>
  )
}
