// Die weiteren Quellen eines Bausteins, wie sie im Baum stehen.
import type { Datenquelle } from './datenquellen'

export interface SchluesselPaar {
  vonFeld: string
  nachFeld: string
}

export const MAX_SCHLUESSELPAARE = 3

export function vollstaendigePaare(traeger: { paare: readonly SchluesselPaar[] }): SchluesselPaar[] {
  return traeger.paare.filter((p) => p.vonFeld.trim() !== '' && p.nachFeld.trim() !== '')
}

export interface BausteinQuelle {
  quelleId: string

  // Die Quelle, mit der die Schluesselpaare verbinden. Leer = die Hauptquelle;
  // so muessen nicht alle Quellen sternfoermig an der ersten haengen.
  partnerId: string

  paare: SchluesselPaar[]
}

export const WEITERE_QUELLEN_PROP = 'weitereQuellen'

export const QUELLEN_DEFAULTS: Record<string, BausteinQuelle[]> = {
  [WEITERE_QUELLEN_PROP]: [],
}

// Das Schluesselpaar ist ausdruecklich freiwillig: eine Quelle ohne Paar ist eine
// reine Nachschlagequelle. Verlangte diese Stelle ein Paar, fiele die Quelle auf
// einem leeren Beleg still aus Feldwaehler und Export.
export function quelleBrauchbar(q: BausteinQuelle): boolean {
  return q.quelleId !== ''
}

export function weitereQuellenAus(roh: unknown): BausteinQuelle[] {
  if (!Array.isArray(roh)) return []
  const acc: BausteinQuelle[] = []
  for (const entry of roh) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.quelleId !== 'string') continue
    const paare: SchluesselPaar[] = []
    for (const p of Array.isArray(e.paare) ? e.paare : []) {
      if (!p || typeof p !== 'object') continue
      const pp = p as Record<string, unknown>
      if (typeof pp.vonFeld !== 'string' || typeof pp.nachFeld !== 'string') continue
      paare.push({ vonFeld: pp.vonFeld, nachFeld: pp.nachFeld })
    }
    acc.push({
      quelleId: e.quelleId,
      // Ohne ausdruecklichen Partner verbinden die Paare mit der Hauptquelle.
      partnerId: typeof e.partnerId === 'string' ? e.partnerId : '',
      paare: paare.slice(0, MAX_SCHLUESSELPAARE),
    })
  }
  return acc
}

export interface QuelleInReichweite {
  quelle: Datenquelle

  paare?: SchluesselPaar[]

  // Leer = Hauptquelle; fehlt ganz bei der Hauptquelle selbst.
  partnerId?: string
}

export function quellenAufloesen(
  sourceId: unknown,
  weitereRoh: unknown,
  bibliothek: readonly Datenquelle[],
): QuelleInReichweite[] {
  const erste = typeof sourceId === 'string' && sourceId !== ''
    ? bibliothek.find((s) => s.id === sourceId)
    : undefined
  if (!erste) return []
  const acc: QuelleInReichweite[] = [{ quelle: erste }]
  const gesehen = new Set<string>([erste.id])
  for (const q of weitereQuellenAus(weitereRoh)) {
    if (gesehen.has(q.quelleId) || !quelleBrauchbar(q)) continue
    const source = bibliothek.find((s) => s.id === q.quelleId)
    if (!source) continue
    gesehen.add(source.id)
  // Eine Quelle, die auf sich selbst zeigt, ist kein Partner: sie fiele der
  // Kettenaufloesung als Kreis vor die Fuesse.
    const partnerId = q.partnerId === source.id ? '' : q.partnerId
    acc.push({ quelle: source, paare: vollstaendigePaare(q), partnerId })
  }
  return acc
}

export function paarKlartext(
  paare: readonly SchluesselPaar[],
  erste: Datenquelle | undefined,
): string {
  return paare
    .map((p) => erste?.felder.find((f) => f.code === p.vonFeld)?.name ?? '')
    .filter((n) => n !== '')
    .join(' + ')
}
