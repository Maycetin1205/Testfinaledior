// Die Datenquellen einer Maske: Form, Alias, Satznummer und was bei SoftEngine bestellt wird.
import { QUELLEN_TRENNER, zerlegeBindung } from '../maske/bausteinArt'
import { holWertVon, pruefeHolWert, type HolWert } from './holWert'
import type { EintragProblem } from './ladeProblem'
import { ladeRelationVon, POS_LEN, pruefeLadeRelation, type LadeRelation } from './ladeRelation'
import {
  artFuer,
  QUELLEN_ART_KENNUNGEN,
  QUELLEN_ARTEN,
  tabellenKennungNoetig,
  traegt,
  type QuellenArtKennung,
  type Schluessel,
} from './quellenArten'

export {
  artFuer, QUELLEN_ART_KENNUNGEN, QUELLEN_ARTEN, tabellenKennungNoetig, traegt,
  type QuellenArtKennung, type Schluessel,
}
export {
  holWertVon,
  HOL_WERT_QUELLEN,
  holWertQuelleErlaubt,
  quellenAusHolWert,
  type HolWert,
} from './holWert'
export {
  felderHinterSchnitt,
  LADE_RELATION_STANDARD,
  ladeRelationVon,
  relationNrAusEingabe,
  type LadeRelation,
} from './ladeRelation'
export {
  feldVorsatzAusEingabe,
  feldCode,
  kennungAnzeige,
  kennungAusEingabe,
  kopfsatzAusEingabe,
  quellenKennung,
  spaltenNameAusEingabe,
} from './quellenEingabe'

// Weiter oben hoert der Wert auf, eine Breite zu sein, und faengt an, eine
// Tabelle zu sprengen.
export const ZEICHEN_MAX = 200

export interface Datenfeld {
  code: string

  name: string

  // Wie breit eine Spalte auf dieses Feld beim Anlegen wird, in Zeichen. Nur
  // ein Startwert: danach ist es eine gewoehnliche Spaltenbreite zum Ziehen.
  // Fehlt sie, bekommt die Spalte wie bisher den mittleren Anteil.
  zeichen?: number
}

export interface Datenquelle {
  id: string

  name: string

  art: QuellenArtKennung

  idbId?: string

  satzFeld?: string

  kopfsatzIndex?: string

  lieferung?: 'liste' | 'offenerSatz'

  ladeRelation?: LadeRelation

  holWert?: HolWert

  feldVorsatz?: string

  felder: readonly Datenfeld[]
}

// Diese Quelle wartet auf keine Lieferung, sie fragt selbst; darum steht sie
// nicht in der SEvariablen-Bestellung.
export function holtSelbst(source: Datenquelle): boolean {
  return ladeRelationVon(source) !== null || holWertVon(source) !== null
}

export function feldKlarname(
  bindung: string,
  eigeneQuelleId: string,
  sources: readonly Datenquelle[],
): string {
  const { quelleId, code } = zerlegeBindung(bindung)
  const gesucht = quelleId === '' ? eigeneQuelleId : quelleId
  if (gesucht === '' || code === '') return ''
  const quelle = sources.find((s) => s.id === gesucht)
  return quelle?.felder.find((f) => f.code === code)?.name ?? ''
}

export function istOffenerSatz(source: Datenquelle): boolean {
  return traegt(artFuer(source.art), 'VAR') && source.lieferung === 'offenerSatz'
}

// Arten ohne Satznummer geben '': sonst bestellte der Export einen Feldcode, den
// ihre Quelle nicht kennt, und die Tabelle boete Aendern und Loeschen an.
export function satzNummerVon(source: Datenquelle): string {
  if (!traegt(artFuer(source.art), 'INDEX_NR')) return ''
  return (source.satzFeld ?? '').trim()
}

// SoftEngine legt die Zeilen unter dem ALIAS ab, und die Laufzeit sucht sie ueber
// genau diesen Namen; der erste Treffer gewinnt. Zwei gleich benannte Quellen
// zeigten stumm dieselben Daten, darum macht der Export sie eindeutig.
export function aliasVon(name: string): string {
  return name.trim().toLowerCase()
}

export function mitEindeutigenNamen(sources: readonly Datenquelle[]): Datenquelle[] {
  const vergeben = new Set<string>()
  return sources.map((s) => {
    let name = s.name
    for (let nr = 2; vergeben.has(aliasVon(name)); nr++) name = `${s.name.trim()} ${nr}`
    vergeben.add(aliasVon(name))
    return name === s.name ? s : { ...s, name }
  })
}

export function tabellenIdVon(source: Datenquelle): string {
  const feste = artFuer(source.art).tabellenId
  return feste === '' ? (source.idbId ?? '') : feste
}

export function bestellteFelder(
  source: Datenquelle,
  benutzt?: ReadonlySet<string>,
  holSchluessel: readonly string[] = [],
): string {
  const mitSchluesseln = (codes: string[]): string[] => {
    for (const code of holSchluessel) {
      if (!codes.includes(code)) codes.push(code)
    }
    return codes
  }
  // Bestellt wird, was die Maske wirklich liest, nicht was die Quelle kennt:
  // SoftEngine schlaegt zu jedem gelieferten Wert nach.
  const nurBenutzte = (vorne: readonly string[], gelesen: ReadonlySet<string>): string[] => {
    const codes = [...vorne]
    for (const f of source.felder) {
      if (gelesen.has(f.code) && !codes.includes(f.code)) codes.push(f.code)
    }
    for (const code of gelesen) {
      if (!codes.includes(code)) codes.push(code)
    }
    return mitSchluesseln(codes)
  }

  // Aus dem indexField loest sich {PINDEX} auf. Gebunden ist es fast nie,
  // bestellt werden muss es trotzdem: sonst schreibt Aendern ins Nichts.
  const index = satzNummerVon(source)
  const vorne = index === '' ? [] : [index]

  if (artFuer(source.art).felderEinzeln) {
    // Ohne bekannte Verwendung bleibt es bei der ganzen Liste: eine leere
    // Bestellung waere ein stiller Ausfall.
    if (!benutzt || benutzt.size === 0) {
      return mitSchluesseln(source.felder.map((f) => f.code)).join(',')
    }
    return nurBenutzte(vorne, benutzt).join(',')
  }

  if (!benutzt || benutzt.size === 0) return '*'

  const codes = nurBenutzte(vorne, benutzt)

  // Der Rueckfall auf '*' gehoert allein hierher: oben ist '*' nicht erlaubt, und
  // dort sind Codes ohne pos_len normal.
  return codes.every((code) => POS_LEN.test(code)) ? codes.join(',') : '*'
}

export function loopReihenfolge(sources: readonly Datenquelle[]): Datenquelle[] {
  const alleinstehend: Datenquelle[] = []
  const unterKopfsatz: Datenquelle[] = []
  for (const source of sources) {
    if (traegt(artFuer(source.art), 'KOPFSATZ_INDEX')) unterKopfsatz.push(source)
    else alleinstehend.push(source)
  }
  return [...alleinstehend, ...unterKopfsatz]
}

export function kopfsatzVon(source: Datenquelle): string {
  if (!traegt(artFuer(source.art), 'KOPFSATZ_INDEX')) return ''
  return (source.kopfsatzIndex ?? '').trim()
}

export function varAusKopfsaetzen(
  sources: readonly Datenquelle[],
): { ID: string; FELDER: string }[] {
  const proId = new Map<string, string[]>()
  for (const s of sources) {
    const kopfsatz = kopfsatzVon(s)
    if (kopfsatz === '') continue

    const teile = /^([A-Za-z][A-Za-z0-9]*)_(\d+_\d+)$/.exec(kopfsatz)
    if (!teile) continue
    const felder = proId.get(teile[1]) ?? []
    if (!felder.includes(teile[2])) felder.push(teile[2])
    proId.set(teile[1], felder)
  }
  return [...proId].map(([ID, felder]) => ({ ID, FELDER: felder.join(',') }))
}

export function pruefeDatenquellen(
  raw: unknown,
): { liste: Datenquelle[]; probleme: EintragProblem[] } {
  const probleme: EintragProblem[] = []
  if (!Array.isArray(raw)) return { liste: [], probleme }
  const acc: Datenquelle[] = []
  const seen = new Set<string>()
  let nr = 0
  for (const entry of raw) {
    nr++

    const stelle = entry && typeof entry === 'object'
      && typeof (entry as Record<string, unknown>).id === 'string'
      && (entry as Record<string, unknown>).id !== ''
      ? (entry as Record<string, unknown>).id as string
      : `Eintrag ${nr}`
    const weg = (grund: string): void => { probleme.push({ stelle, grund }) }
    if (!entry || typeof entry !== 'object') {
      weg('die Datenquelle ist unlesbar')
      continue
    }
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '') {
      weg('der Datenquelle fehlt ihre Kennung')
      continue
    }
    if (seen.has(e.id)) {
      weg('diese Kennung kommt zweimal vor')
      continue
    }

    if (e.id.includes(QUELLEN_TRENNER)) {
      weg(`die Kennung enthält „${QUELLEN_TRENNER}" und wäre damit mehrdeutig`)
      continue
    }
    if (typeof e.name !== 'string' || e.name.trim() === '') {
      weg('der Klarname fehlt')
      continue
    }
    if (typeof e.art !== 'string' || !QUELLEN_ART_KENNUNGEN.includes(e.art as QuellenArtKennung)) {
      weg('die Art der Datenquelle fehlt oder ist unbekannt')
      continue
    }
    // Fehlt sie, bestellte der Export einen SEFILELOOP-Eintrag mit leerer ID, und
    // SoftEngine bricht dann die ganze Loop-Liste ab.
    if (tabellenKennungNoetig(artFuer(e.art as QuellenArtKennung))
      && (typeof e.idbId !== 'string' || e.idbId.trim() === '')) {
      weg('die Tabellen-Kennung fehlt (z. B. IDB0001)')
      continue
    }
    const fields: Datenfeld[] = []
    let feldNr = 0
    for (const f of Array.isArray(e.felder) ? e.felder : []) {
      feldNr++
      const feldWeg = (grund: string): void => {
        probleme.push({ stelle: `${stelle} · Feld ${feldNr}`, grund })
      }
      if (!f || typeof f !== 'object') {
        feldWeg('das Feld ist unlesbar')
        continue
      }
      const ff = f as Record<string, unknown>
      if (typeof ff.code !== 'string' || ff.code === '') {
        feldWeg('dem Feld fehlt sein Feldcode')
        continue
      }

      if (ff.code.includes(QUELLEN_TRENNER)) {
        feldWeg(`der Feldcode enthält „${QUELLEN_TRENNER}" und wäre damit mehrdeutig`)
        continue
      }
      if (typeof ff.name !== 'string' || ff.name === '') {
        feldWeg('dem Feld fehlt sein Klarname')
        continue
      }

      const zeichen = typeof ff.zeichen === 'number' && Number.isFinite(ff.zeichen)
        && ff.zeichen >= 1
        ? Math.min(ZEICHEN_MAX, Math.round(ff.zeichen))
        : undefined
      fields.push({
        code: ff.code,
        name: ff.name,
        ...(zeichen === undefined ? {} : { zeichen }),
      })
    }

    const ladeRelation = e.ladeRelation === undefined ? null : pruefeLadeRelation(e.ladeRelation)
    if (e.ladeRelation !== undefined && ladeRelation === null) {
      probleme.push({ stelle, grund: 'die Hol-Relation ist unvollständig und wurde verworfen' })
    }
    const holWert = e.holWert === undefined ? null : pruefeHolWert(e.holWert)
    if (e.holWert !== undefined && holWert === null) {
      probleme.push({ stelle, grund: 'die Wert-Relation ist unvollständig und wurde verworfen' })
    }
    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      art: e.art as QuellenArtKennung,
      ...(typeof e.idbId === 'string' && e.idbId !== '' ? { idbId: e.idbId } : {}),
      ...(typeof e.satzFeld === 'string' && e.satzFeld !== '' ? { satzFeld: e.satzFeld } : {}),
      ...(typeof e.kopfsatzIndex === 'string' && e.kopfsatzIndex !== ''
        ? { kopfsatzIndex: e.kopfsatzIndex }
        : {}),
      ...(e.lieferung === 'offenerSatz' ? { lieferung: 'offenerSatz' as const } : {}),
      ...(typeof e.feldVorsatz === 'string' && e.feldVorsatz !== ''
        ? { feldVorsatz: e.feldVorsatz }
        : {}),
      ...(ladeRelation ? { ladeRelation } : {}),
      ...(holWert ? { holWert } : {}),
      felder: fields,
    })
  }
  return { liste: acc, probleme }
}
