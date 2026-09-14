// Die Spaltenliste einer Tabelle: Form, Kennungen, Reihenfolge, Sicht beim Zeichnen.
import { kennungenVergeben } from '../../core/blocks/listenBindung'

export interface Spalte {
  // Ketten und Berechnungen zeigen auf die Kennung, nie auf Platz oder Feld:
  // ein Belegfeld kann doppelt vergeben sein.
  kennung: string
  titel: string
  feld: string

  breite?: number

  summe?: boolean

  // Jeder Zustand und jeder ERP-Kontrakt haengt am PLATZ in der vollen Liste;
  // versteckte Spalten fallen erst beim Zeichnen weg.
  versteckt?: boolean
}

export interface Spaltensicht {
  spalten: readonly Spalte[]
  plaetze: readonly number[]
}

export function spaltenSicht(
  spalten: readonly Spalte[],
  alleZeigen: boolean,
  wegDurchBediener: ReadonlySet<string> = new Set(),
): Spaltensicht {
  const weg = (s: Spalte): boolean => s.versteckt === true || wegDurchBediener.has(s.kennung)
  if (alleZeigen || !spalten.some(weg)) {
    return { spalten, plaetze: spalten.map((_, i) => i) }
  }
  const gezeigt: Spalte[] = []
  const plaetze: number[] = []
  spalten.forEach((s, i) => {
    if (weg(s)) return
    gezeigt.push(s)
    plaetze.push(i)
  })
  if (gezeigt.length === 0 && spalten.length > 0) return { spalten: [spalten[0]], plaetze: [0] }
  return { spalten: gezeigt, plaetze }
}

export const ZELLE_PLATZHALTER = '—'

export const SPALTEN_MIN = 1

export const SPALTEN_MAX = 16

export const SPALTEN_MIN_BREITE = 40

export const STANDARD_TITEL = 'Spalte {n}'

function standardTitelFuer(index: number): string {
  return STANDARD_TITEL.replace('{n}', String(index + 1))
}

export function neueSpalte(index: number): Spalte {
  return { kennung: '', titel: standardTitelFuer(index), feld: '' }
}

// Der Platz der Spalte mit DIESER Kennung, -1 wenn keine sie traegt.
// Berechnungen und Ketten finden ihre Spalte nur so wieder.
export function spalteMitKennung(spalten: readonly Spalte[], kennung: string): number {
  const t = kennung.trim()
  if (t === '') return -1
  return spalten.findIndex((s) => s.kennung === t)
}

export function mitKennungen(spalten: readonly Spalte[]): Spalte[] {
  const kennungen = kennungenVergeben(spalten.map((s) => s.kennung))
  return spalten.map((s, i) => (s.kennung === kennungen[i] ? s : { ...s, kennung: kennungen[i] }))
}

export function standardSpalten(): Spalte[] {
  return mitKennungen([neueSpalte(0)])
}

function alsBreite(v: unknown): number | undefined {
  const zahl = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(zahl)) return undefined
  const gerundet = Math.round(zahl)
  return gerundet < SPALTEN_MIN_BREITE ? SPALTEN_MIN_BREITE : gerundet
}

const BEKANNTE_ANGABEN = ['kennung', 'titel', 'feld', 'breite', 'summe', 'versteckt']

// Was eine erbende Tabelle an IHRER Spalte fuehrt, reist unberuehrt mit: die
// Erfassung haengt Fuellfeld, Schalter und Suchfenster daran. Ohne das verlor
// jedes Anfuegen, Streichen und Verschieben sie still, weil diese Stelle die
// Spalte aus einer festen Schluesselliste neu aufbaut.
function weitereAngaben(o: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {}
  for (const [key, wert] of Object.entries(o)) {
    if (wert !== undefined && !BEKANNTE_ANGABEN.includes(key)) rest[key] = wert
  }
  return rest
}

function alsSpalte(x: unknown, index: number): Spalte {
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    const breite = o.breite === undefined ? undefined : alsBreite(o.breite)
    const spalte: Spalte = {
      kennung: typeof o.kennung === 'string' ? o.kennung.trim() : '',
      titel: typeof o.titel === 'string' ? o.titel : standardTitelFuer(index),
      feld: typeof o.feld === 'string' ? o.feld : '',

      ...(breite === undefined ? {} : { breite }),

      ...(typeof o.summe === 'boolean' ? { summe: o.summe } : {}),

      ...(typeof o.versteckt === 'boolean' ? { versteckt: o.versteckt } : {}),
    }
    // Die geprueften Angaben gewinnen; die mitgereisten fuellen nur auf.
    return Object.assign(weitereAngaben(o), spalte)
  }

  if (typeof x === 'string') return { ...neueSpalte(index), titel: x }
  return neueSpalte(index)
}

export function coerceSpalten(v: unknown): Spalte[] {
  let arr: Spalte[]
  if (Array.isArray(v)) {
    arr = v.map((x, i) => alsSpalte(x, i))
  } else if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && /^\d+$/.test(v))) {
    const n = Math.max(1, Math.floor(Number(v)))
    arr = [...Array(n).keys()].map((i) => neueSpalte(i))
  } else {
    arr = standardSpalten()
  }
  // Nie kuerzen: die Obergrenze gilt nur fuer neue Spalten, sonst verschoeben
  // sich die Plaetze einer gespeicherten Liste.
  if (arr.length < SPALTEN_MIN) arr = [neueSpalte(0)]
  return mitKennungen(arr)
}

export function tryCoerceSpalten(v: string): Spalte[] {
  try {
    return coerceSpalten(JSON.parse(v))
  } catch {
    return standardSpalten()
  }
}

// Die gezogene Zahl gilt als Anteil (fr): feste Pixel liessen rechts eine leere
// Flaeche stehen.
export function spaltenRaster(
  spalten: readonly Spalte[],
  breiten: (index: number) => number | undefined = () => undefined,
): string {
  const eigene = spalten.map((s, i) => breiten(i) ?? s.breite)
  const gesetzt = eigene.filter((w): w is number => w !== undefined)
  const mittel = gesetzt.length === 0
    ? 1
    : Math.max(1, Math.round(gesetzt.reduce((a, b) => a + b, 0) / gesetzt.length))
  return eigene.map((w) => `minmax(0, ${w ?? mittel}fr)`).join(' ')
}

// Die neue Spalte bekommt den mittleren Anteil, das Raster fuellt die Tabelle
// von allein wieder aus.
export function fuegeSpalteAn(spalten: readonly Spalte[]): Spalte[] {
  return mitKennungen([...spalten, neueSpalte(spalten.length)])
}

// Dieselbe Liste zurueck heisst „nicht erlaubt" (letzte Spalte, Platz ausserhalb).
// Die Berechnungen BEHALTEN ihre Groesse auf der gestrichenen Spalte: sie zeigt
// nun ins Leere, die Berechnung rechnet nicht mehr und das Fenster sagt, welche
// Spalte fehlt. Die Groesse still wegzunehmen hiesse, mit einer ANDEREN Formel
// weiterzurechnen, und niemand saehe es.
export function ohneSpalte(spalten: readonly Spalte[], index: number): readonly Spalte[] {
  if (spalten.length <= SPALTEN_MIN || index < 0 || index >= spalten.length) return spalten
  return spalten.filter((_, i) => i !== index)
}

// Dieselbe Liste zurueck heisst „nichts zu tun". Ketten und Berechnungen zeigen
// auf die Kennung und brauchen kein Nachziehen.
export function mitVerschobenerSpalte(
  spalten: readonly Spalte[],
  von: number,
  nach: number,
): readonly Spalte[] {
  if (von < 0 || von >= spalten.length) return spalten
  const ziel = Math.max(0, Math.min(nach, spalten.length - 1))
  if (ziel === von) return spalten
  const l = [...spalten]
  const [spalte] = l.splice(von, 1)
  l.splice(ziel, 0, spalte)
  return l
}
