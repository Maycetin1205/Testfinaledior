// Ein Suchfenster aus der Sicht des Editors: woher es seine Angaben nimmt und
// wohin der gezogene Rand und der Spaltenkopf sie zurueckschreiben. Eingestellt
// wird IM Fenster; diese Datei ist nur der Weg dorthin.
import { coerceErfassungsSpalten } from '../../blocks/erfassung/erfassungsSpalte'
import { fensterSpaltenIn } from '../../blocks/erfassung/erfassungsZeile'
import {
  FENSTER_HOEHE,
  automatikSpalten,
  coerceNachschlagSpalten,
  fensterBreiteFuer,
  oeffneNachschlagen,
} from '../../blocks/tabelle/nachschlagen'
import { DIALOG_RAHMEN_TAG, type DialogRahmen } from '../../blocks/shared/DialogRahmen'
import type { Spalte } from '../../blocks/tabelle/spalten'
import type { BlockNode } from '../../core/blocks/BlockData'
import { zerlegeBindung, type SuchFenster } from '../../core/blocks/BlockDefinition'
import { getBlockDefinition } from '../../core/blocks/blockRegistry'
import type { Editor } from '../../state/Editor'

export interface FensterStand {
  quelleId: string

  // Das Feld, dessen Wert die Maske sich merkt; ohne gestellte Spalten ist es
  // die einzige Spalte des Fensters.
  speicherFeld: string
  speicherTitel: string

  titel: string

  // Was das Fenster ZEIGT: die gestellten Spalten oder die Automatik. Nie leer,
  // damit der Kopf im Fenster immer etwas zum Anfassen hat.
  spalten: readonly Spalte[]

  // Ob die Liste vom Bauer gestellt ist. Nur dann heisst „letzte Spalte weg"
  // etwas: die Automatik hat nichts wegzunehmen.
  gestellt: boolean

  breite: number
  hoehe: number

  setzeSpalten: (spalten: readonly Spalte[]) => void

  setzeMass: (achse: 'breite' | 'hoehe', wert: number | undefined) => void
}

function alsZahl(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : undefined
  if (typeof v !== 'string' || v.trim() === '') return undefined
  const zahl = Number(v.trim())
  return Number.isFinite(zahl) ? Math.round(zahl) : undefined
}

function rohEintraege(block: BlockNode, prop: string): Record<string, unknown>[] {
  const roh = block.props[prop]
  if (!Array.isArray(roh)) return []
  // Rohe Kopien: geschrieben wird die ganze Liste zurueck, und alles, was hier
  // nicht vorkommt, muss unangetastet mitfahren.
  return roh.map((x) => (x && typeof x === 'object' ? { ...(x as Record<string, unknown>) } : {}))
}

// Das eine Fenster des Bausteins: seine eigenen Eigenschaften tragen es.
function standAmBaustein(
  ed: Editor,
  block: BlockNode,
  fenster: SuchFenster,
): FensterStand | null {
  const quelleId = String(block.props[fenster.quelleProp ?? ''] ?? '')
  if (quelleId === '') return null
  const standard = getBlockDefinition(block.type)?.defaultProps ?? {}
  const gestellt = coerceNachschlagSpalten(block.props[fenster.spaltenKey])
  const speicherFeld = String(block.props[fenster.speicherFeldProp ?? ''] ?? '')
  const speicherTitel = String(block.props[fenster.speicherTitelProp ?? ''] ?? '')
  const spalten = gestellt.length > 0
    ? gestellt
    : automatikSpalten({ speicherFeld, speicherTitel })
  return {
    quelleId,
    speicherFeld,
    speicherTitel,
    titel: 'Nachschlagen',
    spalten,
    gestellt: gestellt.length > 0,
    breite: alsZahl(block.props[fenster.breiteKey])
      ?? alsZahl(standard[fenster.breiteKey])
      ?? fensterBreiteFuer(spalten.length),
    hoehe: alsZahl(block.props[fenster.hoeheKey])
      ?? alsZahl(standard[fenster.hoeheKey])
      ?? FENSTER_HOEHE,
    setzeSpalten: (neu) => {
      ed.updateProperty(block.id, fenster.spaltenKey, [...neu])
    },
    // Ohne Mass gilt am Baustein die Vorgabe seines Typs: eine Eigenschaft dort
    // ist nie leer.
    setzeMass: (achse, wert) => {
      const key = achse === 'breite' ? fenster.breiteKey : fenster.hoeheKey
      ed.updateProperty(block.id, key, wert ?? standard[key])
    },
  }
}

// Ein Fenster je Eintrag mit Hilfsquelle: die Spalten der Erfassung.
function standJeEintrag(
  ed: Editor,
  block: BlockNode,
  fenster: SuchFenster,
  platz: number,
): FensterStand | null {
  const prop = fenster.eintraegeProp
  if (prop === undefined) return null
  const eintrag = rohEintraege(block, prop)[platz]
  if (eintrag === undefined) return null
  const { quelleId, code } = zerlegeBindung(String(eintrag[fenster.quelleKey ?? ''] ?? ''))
  // Nur eine Zelle mit Hilfsquelle schlaegt nach; die anderen haben kein Fenster.
  if (quelleId === '') return null
  const titel = String(eintrag[fenster.titelKey ?? ''] ?? '')
  // Grundsatz 1: dieselbe Spaltenliste wie beim Bediener, auch die automatische.
  // Sie aus den Nachbarspalten zu bilden kann heute nur die Erfassung selbst;
  // ein Registry-Eintrag dafuer waere die saubere Form, wenn es der zweite
  // Baustein braucht.
  const ausSpalten = fensterSpaltenIn({
    spalten: coerceErfassungsSpalten(block.props[prop]),
    quelleId: String(block.props.source ?? ''),
    berechnungen: [],
    paareZu: () => [],
    partnerVon: () => '',
  }, platz)
  const spalten = ausSpalten.length > 0
    ? ausSpalten
    : automatikSpalten({ speicherFeld: code, speicherTitel: titel })

  // Die Schluessel dieses Eintrags schreiben: gelesen wird immer der FRISCHE
  // Stand, nicht der beim Aufmachen. Sonst nahm ein gezogener Rand eine
  // Spaltenwahl von vorhin wieder zurueck.
  const schreibe = (teil: Record<string, unknown>): void => {
    const jetzt = ed.getNode(block.id)
    if (!jetzt) return
    const next = rohEintraege(jetzt, prop)
    const ziel = next[platz]
    if (!ziel) return
    for (const [key, wert] of Object.entries(teil)) {
      // `undefined` LOESCHT den Schluessel: keine Angabe heisst Automatik, und
      // ein leerer Wert reiste sonst in jede Maskendatei mit.
      if (wert === undefined) delete ziel[key]
      else ziel[key] = wert
    }
    ed.updateProperty(block.id, prop, next)
  }

  return {
    quelleId,
    speicherFeld: code,
    speicherTitel: titel,
    titel: titel !== '' ? titel : `Spalte ${platz + 1}`,
    spalten,
    gestellt: coerceNachschlagSpalten(eintrag[fenster.spaltenKey]).length > 0,
    breite: alsZahl(eintrag[fenster.breiteKey]) ?? fensterBreiteFuer(spalten.length),
    hoehe: alsZahl(eintrag[fenster.hoeheKey]) ?? FENSTER_HOEHE,
    setzeSpalten: (neu) => schreibe({
      [fenster.spaltenKey]: neu.length === 0 ? undefined : [...neu],
    }),
    setzeMass: (achse, wert) => schreibe({
      [achse === 'breite' ? fenster.breiteKey : fenster.hoeheKey]: wert,
    }),
  }
}

export function fensterStandVon(
  ed: Editor,
  blockId: string,
  fenster: SuchFenster,
  platz: number,
): FensterStand | null {
  const block = ed.getNode(blockId)
  if (!block) return null
  return fenster.eintraegeProp === undefined
    ? standAmBaustein(ed, block, fenster)
    : standJeEintrag(ed, block, fenster, platz)
}

// Das eine Fenster, das im Editor offen ist: nachschlagen.ts macht das vorige
// immer zu. Seine Spaltenkoepfe bedient die Shell, nicht der Wirt des
// Bausteins — darum eine Anmeldestelle und kein Zustand im BlockHost.
export interface OffenesFenster {
  blockId: string
  fenster: SuchFenster
  platz: number
}

// Der Rahmen des offenen Fensters, an seiner Marke am document.body gefunden.
// Nachgeschlagen statt festgehalten: null heisst zugleich „steht nicht mehr".
export function fensterRahmenImEditor(): DialogRahmen | null {
  return document.body.querySelector<DialogRahmen>(
    `${DIALOG_RAHMEN_TAG}[data-ff-nachschlagen]`,
  )
}

let offen: OffenesFenster | null = null
const horcher = new Set<() => void>()

export function offenesFensterImEditor(): OffenesFenster | null {
  return offen
}

export function beiFensterWechsel(fn: () => void): () => void {
  horcher.add(fn)
  return () => {
    horcher.delete(fn)
  }
}

function melde(neu: OffenesFenster | null): void {
  offen = neu
  for (const fn of [...horcher]) fn()
}

export function fensterImEditorVergessen(): void {
  if (offen !== null) melde(null)
}

// Die Kantengriffe der Tabelle melden beim Loslassen ihre ganze Spaltenliste,
// wie jeder Baustein im Editor. Am Fenster haengt kein Wirt, der das hoert —
// hier ist er. Uebernommen wird daraus NUR der Anteil: Titel und Feld gehoeren
// dem Feldwaehler. Eine automatische Liste steht danach als Stellung im Baum,
// aber Wort fuer Wort so, wie das Fenster sie zeigte.
function verdrahteBreiten(
  rahmen: DialogRahmen,
  ed: Editor,
  blockId: string,
  fenster: SuchFenster,
  platz: number,
): void {
  rahmen.querySelector('ff-tabelle')?.addEventListener('ff-prop-change', (ereignis) => {
    const detail = (ereignis as CustomEvent<{ attr?: string; value?: unknown }>).detail
    if (detail?.attr !== 'spalten') return
    const gezogen = coerceNachschlagSpalten(detail.value)
    // Frisch gelesen: zwischen Aufmachen und Loslassen kann eine Feldwahl die
    // Liste schon geaendert haben.
    const stand = fensterStandVon(ed, blockId, fenster, platz)
    if (stand === null || gezogen.length !== stand.spalten.length) return
    let anders = false
    const neu = stand.spalten.map((s, i) => {
      const breite = gezogen[i]?.breite
      if (breite === undefined || breite === s.breite) return s
      anders = true
      return { ...s, breite }
    })
    // Dieselben Anteile noch einmal sind kein Schritt in der Historie.
    if (anders) stand.setzeSpalten(neu)
  })
}

// Dieselbe Flaeche wie beim Bediener, nur ohne Saetze und mit den zwei
// Zieh-Anfassern: was der Bauer hier zieht oder waehlt, steht danach als
// Eigenschaft im Baum, also nimmt Strg+Z es zurueck.
export function oeffneFensterImEditor(
  ed: Editor,
  el: HTMLElement,
  blockId: string,
  fenster: SuchFenster,
  platz: number,
): boolean {
  const stand = fensterStandVon(ed, blockId, fenster, platz)
  if (stand === null) return false
  oeffneNachschlagen({
    el,
    quelleId: stand.quelleId,
    speicherFeld: stand.speicherFeld,
    speicherTitel: stand.speicherTitel,
    spalten: stand.spalten,
    titel: stand.titel,
    breite: stand.breite,
    hoehe: stand.hoehe,
    imEditor: true,
    setzeMass: stand.setzeMass,
    onUebernehmen: () => {},
  })
  const rahmen = fensterRahmenImEditor()
  if (rahmen === null) return false
  verdrahteBreiten(rahmen, ed, blockId, fenster, platz)
  melde({ blockId, fenster, platz })
  return true
}
