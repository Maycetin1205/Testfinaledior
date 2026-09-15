// Die Version des Masken-Aufbaus und der Weg von der letzten zur aktuellen.
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import {
  alsRundung,
  freieBerechnungsKennung,
  berechnungenAus,
  zahlText,
  STELLEN_MAX,
  type Berechnung,
  type Faktor,
} from '../../kern/daten/berechnung'
import { EINHEIT_STANDARD } from '../../kern/daten/einheiten'
import { BEREICH_AUFBAU, type LadeProblem } from '../../kern/daten/ladeProblem'

export const CURRENT_SCHEMA_VERSION = 9

// Der aelteste Stand, den der Lader noch auf den aktuellen hebt.
const AELTESTER_LESBARER = 8

export function schemaLesbar(version: unknown): version is number {
  return typeof version === 'number' && version >= AELTESTER_LESBARER
    && version <= CURRENT_SCHEMA_VERSION
}

function objekt(wert: unknown): wert is Record<string, unknown> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

// Schema 8 hatte an einer Spalte eine „formel": Glieder mit Rechenzeichen, die
// nur diese eine Spalte fuellten. Seit 9 ist das eine Berechnung mit der
// Spalte als Leitgroesse; die uebrigen Groessen bleiben Eingaben, so rechnet
// die Maske genau wie zuvor.
function berechnungAusFormel(
  spalte: Record<string, unknown>,
  roh: Record<string, unknown>,
  kennung: string,
): Berechnung | string {
  const glieder = Array.isArray(roh.glieder) ? roh.glieder : []
  const zeichen = Array.isArray(roh.zeichen) ? roh.zeichen : []
  const titel = typeof spalte.titel === 'string' && spalte.titel !== '' ? spalte.titel : String(spalte.kennung ?? '')
  if (zeichen.some((z) => z === '+' || z === '-')) {
    return `Die Formel der Spalte „${titel}" rechnet mit Plus oder Minus; eine Berechnung kennt nur Mal und Geteilt. Bitte die Formel neu anlegen.`
  }
  const zaehler: Faktor[] = []
  const nenner: Faktor[] = []
  glieder.forEach((glied, i) => {
    if (!objekt(glied)) return
    const ziel = i > 0 && zeichen[i - 1] === '/' ? nenner : zaehler
    const nr = `f${i + 1}`
    if (typeof glied.zahl === 'number' && Number.isFinite(glied.zahl)) {
      ziel.push({ art: 'zahl', kennung: nr, name: zahlText(glied.zahl, STELLEN_MAX), zahl: glied.zahl, einheit: EINHEIT_STANDARD })
      return
    }
    ziel.push({
      art: 'spalte',
      kennung: nr,
      spalte: typeof glied.spalte === 'string' ? glied.spalte.trim() : '',
      einheit: EINHEIT_STANDARD,
      ergebnis: false,
      runden: alsRundung(undefined),
    })
  })
  return {
    kennung,
    name: titel,
    leit: {
      art: 'spalte',
      kennung: 'f0',
      spalte: typeof spalte.kennung === 'string' ? spalte.kennung : '',
      einheit: EINHEIT_STANDARD,
      ergebnis: true,
      runden: alsRundung(roh.runden),
    },
    zaehler,
    nenner,
  }
}

function hebeVon8(tree: Record<string, unknown>): { tree: Record<string, unknown>; probleme: LadeProblem[] } {
  const probleme: LadeProblem[] = []
  const raus: Record<string, unknown> = {}
  for (const [id, node] of Object.entries(tree)) {
    raus[id] = node
    if (!objekt(node) || !objekt(node.props)) continue
    const props = node.props
    const alteSpalten: unknown[] | undefined = Array.isArray(props.spalten) ? props.spalten : undefined
    if (alteSpalten === undefined || !alteSpalten.some((s) => objekt(s) && objekt(s.formel))) continue
    const prop = typeof node.type === 'string' ? faehigkeit(bausteinArt(node.type), 'rechnen')?.prop : undefined
    if (prop === undefined) {
      probleme.push({ bereich: BEREICH_AUFBAU, stelle: id, grund: `der Baustein „${id}" traegt eine Formel, kann aber nicht rechnen` })
      continue
    }
    const berechnungen: Berechnung[] = berechnungenAus(props[prop])
    const spalten = alteSpalten.map((s) => {
      if (!objekt(s) || !objekt(s.formel)) return s
      const { formel, ...rest } = s
      const neu = berechnungAusFormel(rest, formel, freieBerechnungsKennung(berechnungen))
      if (typeof neu === 'string') {
        probleme.push({ bereich: BEREICH_AUFBAU, stelle: id, grund: neu })
        return s
      }
      berechnungen.push(neu)
      return rest
    })
    raus[id] = { ...node, props: { ...props, spalten, [prop]: berechnungen } }
  }
  return { tree: raus, probleme }
}

// Ein aelterer Stand wird VOR der Pruefung angehoben; was sich nicht heben
// laesst, ist ein benannter Verlust und kein stiller.
export function hebeAufAktuell(
  schemaVersion: number,
  tree: Record<string, unknown>,
): { tree: Record<string, unknown>; probleme: LadeProblem[] } {
  if (schemaVersion === 8) return hebeVon8(tree)
  return { tree, probleme: [] }
}
