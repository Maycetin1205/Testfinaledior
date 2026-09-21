// Eine Spalte, die schreibt: was sie ueber die Listenspalte hinaus kennt, wie der
// Editor sie fuehrt und wann sie in der Zeile aenderbar ist.
import type { EintragsSchalter, ListenBindung } from '../../kern/maske/bausteinArt'
import { schalterAn, schalterFuer } from '../../kern/maske/listenBindung'
import { coerceSpalten, SPALTEN_BINDUNG, standardSpalten, type Spalte } from './spalten'

export interface ErfassungsSpalte extends Spalte {
  aenderbar?: boolean

  fuellFeld?: string

  // Die Spalten des Suchfensters dieser Zelle (F5). LEER heisst Automatik: das
  // Fenster zeigt nur das Feld dieser Spalte. Sein Mass steht an der Erfassung.
  fensterSpalten?: Spalte[]
}

function erfassungsTeil(x: unknown): Partial<ErfassungsSpalte> {
  if (!x || typeof x !== 'object') return {}
  const o = x as Record<string, unknown>
  return {
    ...(typeof o.aenderbar === 'boolean' ? { aenderbar: o.aenderbar } : {}),

    ...(typeof o.fuellFeld === 'string' && o.fuellFeld.trim() !== ''
      ? { fuellFeld: o.fuellFeld.trim() }
      : {}),

    // Eine leere Liste ist dasselbe wie keine: zurueck zur Automatik.
    ...(Array.isArray(o.fensterSpalten) && o.fensterSpalten.length > 0
      ? { fensterSpalten: coerceSpalten(o.fensterSpalten) }
      : {}),
  }
}

// Die Liste liest die gemeinsamen Angaben, die Erfassung legt ihre daneben. Der
// Platz bleibt derselbe: an ihm haengt jeder Zustand und jeder ERP-Kontrakt.
export function coerceErfassungsSpalten(v: unknown): ErfassungsSpalte[] {
  const roh = Array.isArray(v) ? v : []
  return coerceSpalten(v).map((spalte, i) => ({ ...spalte, ...erfassungsTeil(roh[i]) }))
}

export function tryCoerceErfassungsSpalten(v: string): ErfassungsSpalte[] {
  try {
    return coerceErfassungsSpalten(JSON.parse(v))
  } catch {
    return standardSpalten()
  }
}

const AENDERBAR: EintragsSchalter = {
  schluessel: 'aenderbar',
  name: 'In der Zeile änderbar',
  kurz: 'änderbar',
  standard: true,
  nurEigeneQuelle: true,
}

export const ERFASSUNG_SPALTEN_BINDUNG: ListenBindung = {
  ...SPALTEN_BINDUNG,

  eintragsSchalter: (SPALTEN_BINDUNG.eintragsSchalter ?? [])
    .flatMap((s) => (s.schluessel === 'summe' ? [s, AENDERBAR] : [s])),

  eintragsFeldWahl: [
    {
      schluessel: 'fuellFeld',
      // Die Beschriftung muss sagen, WANN das Feld gilt.
      name: 'Nachschlagen',
      hinweis: 'Beim Erfassen füllt der gewählte Satz der Hilfsquelle diese Zelle.',
      nurFremdeQuellen: true,
    },
  ],
}

export function spalteAenderbar(spalte: Spalte): boolean {
  const eintrag = spalte as unknown as Record<string, unknown>
  return spalte.feld !== ''
    && schalterFuer(ERFASSUNG_SPALTEN_BINDUNG, eintrag).includes(AENDERBAR)
    && schalterAn(AENDERBAR, eintrag)
}
