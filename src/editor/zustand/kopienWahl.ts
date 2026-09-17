// Die Notfallkopien zur Wahl: was in jeder steht, und das Zurueckholen einer.
import type { Editor } from './Editor'
import { meldungen } from './meldungen'
import { alleKopien, type Notfallkopie } from './notfallkopie'
import { leseStand, STORAGE_KEY } from './persistence'

export interface Kopienstand {
  schluessel: string
  zeit: Date | null

  // Zeichen im Speicher; das Einzige, was sich ueber eine unlesbare Kopie
  // sagen laesst.
  groesse: number

  // null heisst: nicht zu ermitteln. Eine Null waere eine Behauptung.
  bausteine: number | null
  datenquellen: number | null
  relationen: number | null

  // Falsch heisst: die Kopie ist kein lesbares JSON-Objekt mehr.
  lesbar: boolean
}

type Zaehlung = Pick<Kopienstand, 'bausteine' | 'datenquellen' | 'relationen' | 'lesbar'>

const UNLESBAR: Zaehlung = {
  bausteine: null, datenquellen: null, relationen: null, lesbar: false,
}

// Gezaehlt wird ohne Pruefung: eine Kopie aus einem alten Format laedt
// vielleicht nicht mehr, aber sie darf trotzdem sagen, was in ihr steht.
function zaehle(raw: string): Zaehlung {
  let roh: unknown
  try { roh = JSON.parse(raw) } catch { return UNLESBAR }
  if (roh === null || typeof roh !== 'object' || Array.isArray(roh)) return UNLESBAR
  const stand = roh as Record<string, unknown>
  const baum = stand.tree
  return {
    lesbar: true,
    // Die Wurzel ist kein Baustein — `blockCount` zaehlt genauso.
    bausteine: baum !== null && typeof baum === 'object' && !Array.isArray(baum)
      ? Math.max(0, Object.keys(baum).length - 1)
      : null,
    datenquellen: Array.isArray(stand.datenquellen) ? stand.datenquellen.length : null,
    relationen: Array.isArray(stand.relationen) ? stand.relationen.length : null,
  }
}

function zuStand(kopie: Notfallkopie): Kopienstand {
  return {
    schluessel: kopie.schluessel,
    zeit: kopie.zeit,
    groesse: kopie.raw.length,
    ...zaehle(kopie.raw),
  }
}

export function kopienZurWahl(): Kopienstand[] {
  return alleKopien(STORAGE_KEY).map(zuStand)
}

function zwei(zahl: number): string {
  return String(zahl).padStart(2, '0')
}

// Ortszeit: der Bediener vergleicht mit seiner Uhr, nicht mit UTC.
export function zeitText(kopie: Kopienstand): string {
  const zeit = kopie.zeit
  if (zeit === null) return 'Zeitpunkt unbekannt'
  return `${zwei(zeit.getDate())}.${zwei(zeit.getMonth() + 1)}.${zeit.getFullYear()}, `
    + `${zwei(zeit.getHours())}:${zwei(zeit.getMinutes())}`
}

function anzahl(wieviele: number | null, eins: string, viele: string): string {
  if (wieviele === null) return `— ${viele}`
  return `${wieviele} ${wieviele === 1 ? eins : viele}`
}

function zahlenSatz(
  bausteine: number | null, datenquellen: number | null, relationen: number | null,
): string {
  return [
    anzahl(bausteine, 'Baustein', 'Bausteine'),
    anzahl(datenquellen, 'Datenquelle', 'Datenquellen'),
    anzahl(relationen, 'Relation', 'Relationen'),
  ].join(', ')
}

export function inhaltText(kopie: Kopienstand): string {
  if (!kopie.lesbar) {
    return `Inhalt unlesbar — ${Math.max(1, Math.round(kopie.groesse / 1024))} kB`
  }
  return zahlenSatz(kopie.bausteine, kopie.datenquellen, kopie.relationen)
}

// Eine gewaehlte Kopie zurueck in den Editor, als EIN Undo-Schritt. Die Kopie
// selbst bleibt liegen, bis sie bewusst entfernt wird.
export function stelleKopieWiederHer(editor: Editor, schluessel: string): void {
  const kopie = alleKopien(STORAGE_KEY).find((k) => k.schluessel === schluessel)
  if (kopie === undefined) {
    meldungen.melde('Diese Notfallkopie liegt nicht mehr im Browser-Speicher.')
    return
  }
  const stand = leseStand(kopie.raw, STORAGE_KEY)
  if (stand === null) return
  editor.ersetzeMaske({
    tree: stand.tree,
    datenquellen: [...stand.datenquellen],
    relationen: [...stand.relationen],
  })
  // Gezaehlt wird, was ANKAM: eine Kopie, von der nur das Datencenter zu retten
  // war, darf nicht mit den Zahlen der Vorschau bestaetigt werden.
  meldungen.melde(
    `Notfallkopie vom ${zeitText(zuStand(kopie))} wiederhergestellt: `
    + `${zahlenSatz(
      Object.keys(stand.tree).length - 1, stand.datenquellen.length, stand.relationen.length,
    )}. Strg+Z nimmt es zurück.`,
    'hinweis',
  )
}
