// Die weiteren Quellen eines Bausteins, wie sie im Baum stehen.
import type { Datenquelle } from './datenquellen'

export interface SchluesselPaar {
  fromField: string
  toField: string
}

export const MAX_SCHLUESSELPAARE = 3

export function vollstaendigePaare(traeger: { keyPairs: readonly SchluesselPaar[] }): SchluesselPaar[] {
  return traeger.keyPairs.filter((p) => p.fromField.trim() !== '' && p.toField.trim() !== '')
}

export interface BausteinQuelle {
  quelleId: string

  // Die Quelle, mit der die Schluesselpaare verbinden. Leer = die Hauptquelle;
  // so muessen nicht alle Quellen sternfoermig an der ersten haengen.
  partnerId: string

  keyPairs: SchluesselPaar[]
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
    const keyPairs: SchluesselPaar[] = []
    for (const p of Array.isArray(e.keyPairs) ? e.keyPairs : []) {
      if (!p || typeof p !== 'object') continue
      const pp = p as Record<string, unknown>
      if (typeof pp.fromField !== 'string' || typeof pp.toField !== 'string') continue
      keyPairs.push({ fromField: pp.fromField, toField: pp.toField })
    }
    acc.push({
      quelleId: e.quelleId,
      // Ohne ausdruecklichen Partner verbinden die Paare mit der Hauptquelle.
      partnerId: typeof e.partnerId === 'string' ? e.partnerId : '',
      keyPairs: keyPairs.slice(0, MAX_SCHLUESSELPAARE),
    })
  }
  return acc
}

export interface QuelleInReichweite {
  source: Datenquelle

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
  const acc: QuelleInReichweite[] = [{ source: erste }]
  const gesehen = new Set<string>([erste.id])
  for (const q of weitereQuellenAus(weitereRoh)) {
    if (gesehen.has(q.quelleId) || !quelleBrauchbar(q)) continue
    const source = bibliothek.find((s) => s.id === q.quelleId)
    if (!source) continue
    gesehen.add(source.id)
  // Eine Quelle, die auf sich selbst zeigt, ist kein Partner: sie fiele der
  // Kettenaufloesung als Kreis vor die Fuesse.
    const partnerId = q.partnerId === source.id ? '' : q.partnerId
    acc.push({ source, paare: vollstaendigePaare(q), partnerId })
  }
  return acc
}

export function paarKlartext(
  paare: readonly SchluesselPaar[],
  erste: Datenquelle | undefined,
): string {
  return paare
    .map((p) => erste?.fields.find((f) => f.code === p.fromField)?.label ?? '')
    .filter((n) => n !== '')
    .join(' + ')
}
