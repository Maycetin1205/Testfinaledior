// Eine Spalte, die schreibt: was die Erfassung je Spalte kennt und die Liste nicht.
import { coerceSpalten, standardSpalten, type Spalte } from '../faehigkeiten/spalten'

export interface ErfassungsSpalte extends Spalte {
  aenderbar?: boolean

  fuellFeld?: string

  // Das Suchfenster dieser Zelle (F5). LEER heisst Automatik: das Fenster nimmt
  // die Spalten der Tabelle, die auf dieselbe Hilfsquelle zeigen.
  fensterSpalten?: Spalte[]

  fensterBreite?: number
  fensterHoehe?: number
}

// Unter 120 px ist kein Fenster mehr, ueber 2000 passt es auf keinen Bildschirm.
const FENSTER_MIN = 120
const FENSTER_MAX = 2000

function fensterMass(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const zahl = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(zahl)) return undefined
  return Math.min(FENSTER_MAX, Math.max(FENSTER_MIN, Math.round(zahl)))
}

function erfassungsTeil(x: unknown): Partial<ErfassungsSpalte> {
  if (!x || typeof x !== 'object') return {}
  const o = x as Record<string, unknown>
  const breite = fensterMass(o.fensterBreite)
  const hoehe = fensterMass(o.fensterHoehe)
  return {
    ...(typeof o.aenderbar === 'boolean' ? { aenderbar: o.aenderbar } : {}),

    ...(typeof o.fuellFeld === 'string' && o.fuellFeld.trim() !== ''
      ? { fuellFeld: o.fuellFeld.trim() }
      : {}),

    // Eine leere Liste ist dasselbe wie keine: zurueck zur Automatik.
    ...(Array.isArray(o.fensterSpalten) && o.fensterSpalten.length > 0
      ? { fensterSpalten: coerceSpalten(o.fensterSpalten) }
      : {}),

    ...(breite === undefined ? {} : { fensterBreite: breite }),

    ...(hoehe === undefined ? {} : { fensterHoehe: hoehe }),
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
