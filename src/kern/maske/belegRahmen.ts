// Die Nummer eines Belegerfassungs-Layoutrahmens: eine Eigenschaft der
// Maskenwurzel, wie der Maskenname.
import { WURZEL_ID, type Maskenbaum } from './baum'

// Ein Layoutrahmen heisst in SoftEngine nicht „index": er liegt unter
// Belegerfassung/LAYOUTRAHMEN/<Nummer>/ und traegt seine Nummer im Dateinamen.
export const BELEG_RAHMEN_PROP = 'belegRahmen'

// Fuenf Stellen, wie die Ordner der Auslieferung sie fuehren (00001, 00002 ...).
export const RAHMEN_STELLEN = 5

// '' heisst: keine brauchbare Nummer. Null ist keine: den Ordner gibt es nicht.
export function rahmenNummer(roh: unknown): string {
  const text = typeof roh === 'string'
    ? roh.trim()
    : typeof roh === 'number' && Number.isFinite(roh) ? String(roh) : ''
  if (!/^\d{1,5}$/.test(text) || Number(text) === 0) return ''
  return text.padStart(RAHMEN_STELLEN, '0')
}

export function rahmenNummerVon(tree: Maskenbaum): string {
  return rahmenNummer(tree[WURZEL_ID]?.werte[BELEG_RAHMEN_PROP])
}

// Die zwei Dateinamen, die SoftEngine im Rahmenordner erwartet.
export function belegDateinamen(nummer: string): { html: string; sevariablen: string } {
  return {
    html: `Rahmen${nummer}.basis.source.html`,
    sevariablen: `Rahmen${nummer}.basis.SEvariablen.json`,
  }
}
