// Welche Zeile gerade gewaehlt ist, je Auswahl-Geber, und wer davon erfaehrt.
import { BAUSTEIN_ID_ATTR } from '../../kern/daten/aktionen'
import { AUSWAHL_FOLGE_PROP, type AuswahlFolge } from '../../kern/daten/auswahlFolge'
import { getField } from '../../softengine/data'
import { paarListeAusAttribut } from './paarListe'

export function merkmalVon(zeile: unknown): string {
  if (zeile == null) return ''
  try {
    return JSON.stringify(zeile, (_key, wert: unknown) => {
      if (!wert || typeof wert !== 'object' || Array.isArray(wert)) return wert
      const objekt = wert as Record<string, unknown>
      return Object.fromEntries(Object.keys(objekt).sort().map((key) => [key, objekt[key]]))
    }) ?? ''
  } catch {
    return ''
  }
}

// Die Wahl-Nummer sagt, WANN gewaehlt wurde: bei zwei Bausteinen derselben
// Quelle gewinnt die juengste Wahl.
const zustand = new Map<string, { zeile: unknown; merkmal: string; nummer: number }>()
const hoerer = new Set<(durchBedienung: boolean) => void>()

let wahlZaehler = 0

// Ob eine Auswahl-Aenderung vom BEDIENER kam oder aus einem Programm-Lauf,
// reist als Argument mit der Meldung: die holenden Quellen lesen es als Bremse
// gegen Kreis-Feuer. Als globales Flag taugt es nicht, der erste Hoerer
// ueberschriebe es, bevor der zweite liest.
let meldungLaeuft = false
let nachmeldung = false
let nachBedienung = false

function melde(durchBedienung: boolean): void {
  if (meldungLaeuft) {
    nachmeldung = true
    nachBedienung ||= durchBedienung
    return
  }
  meldungLaeuft = true
  let herkunft = durchBedienung
  try {
    do {
      nachmeldung = false
      nachBedienung = false
      hoerer.forEach((cb) => cb(herkunft))
      herkunft = nachBedienung
    } while (nachmeldung)
  } finally {
    meldungLaeuft = false
  }
}

export function aufAuswahlHoeren(cb: (durchBedienung: boolean) => void): void {
  hoerer.add(cb)
}

export function auswahlFuer(geberId: string): unknown | undefined {
  return zustand.get(geberId)?.zeile
}

function auswahlMerkmal(geberId: string): string {
  return zustand.get(geberId)?.merkmal ?? ''
}

// 0 = dieser Geber hat keine Auswahl. Groesser heisst juenger.
export function auswahlNummer(geberId: string): number {
  return zustand.get(geberId)?.nummer ?? 0
}

export function geberIdVon(el: Element): string {
  return el.getAttribute(BAUSTEIN_ID_ATTR) ?? ''
}

export function auswahlWiederfinden<T>(
  geberId: string,
  kandidaten: readonly T[],
  zeileVon: (kandidat: T) => unknown,
  schluesselVon?: (kandidat: T) => string,
): number[] {
  if (geberId === '') return []
  const merkmal = auswahlMerkmal(geberId)
  if (merkmal === '') return []
  const treffer: number[] = []
  kandidaten.forEach((kandidat, i) => {
    if ((schluesselVon?.(kandidat) || merkmalVon(zeileVon(kandidat))) === merkmal) treffer.push(i)
  })
  if (treffer.length === 0) klareAuswahl(geberId)
  else {
    const alt = zustand.get(geberId)
    const zeile = zeileVon(kandidaten[treffer[0]])
    if (alt && merkmalVon(alt.zeile) !== merkmalVon(zeile)) {
      zustand.set(geberId, { ...alt, zeile })
      melde(false)
    }
  }
  return treffer
}

export function waehleAuswahl(geberId: string, zeile: unknown, schluessel = ''): void {
  if (geberId === '') return
  const merkmal = schluessel || merkmalVon(zeile)
  if (merkmal === '') return
  const alt = zustand.get(geberId)
  if (alt && alt.merkmal === merkmal) zustand.delete(geberId)
  else zustand.set(geberId, { zeile, merkmal, nummer: ++wahlZaehler })
  melde(true)
}

// Setzt die Auswahl ohne Umschalten. `durchBedienung` sagt, ob ein Mensch den
// Satz gewaehlt hat; die Hydrierung laesst es weg.
export function setzeAuswahl(geberId: string, zeile: unknown, durchBedienung = false, schluessel = ''): void {
  if (geberId === '') return
  const merkmal = schluessel || merkmalVon(zeile)
  if (merkmal === '') return
  if (zustand.get(geberId)?.merkmal === merkmal) return
  zustand.set(geberId, { zeile, merkmal, nummer: ++wahlZaehler })
  melde(durchBedienung)
}

export function klareAuswahl(geberId: string): void {
  if (!zustand.has(geberId)) return
  zustand.delete(geberId)
  melde(false)
}

const AUSWAHL_FOLGE_ATTR = AUSWAHL_FOLGE_PROP.toLowerCase()

function folgenAusAttribut(el: HTMLElement): AuswahlFolge[] {
  return paarListeAusAttribut(el, AUSWAHL_FOLGE_ATTR, 'geberId')
    .map((e) => ({ geberId: e.id, keyPairs: e.keyPairs }))
}

// Die Bausteine, deren Auswahl dieser hier folgt. Der Filter braucht dazu die
// Feldpaare, eine holende Quelle nur die Zeile selbst.
export function auswahlGeberVon(el: HTMLElement): string[] {
  return folgenAusAttribut(el).map((f) => f.geberId).filter((id) => id !== '')
}

export function zeilenNachAuswahl(
  el: HTMLElement,
  rows: unknown[],
): { rows: unknown[]; gefiltert: boolean } {
  let raus = rows
  let gefiltert = false
  for (const folge of folgenAusAttribut(el)) {
    const auswahl = auswahlFuer(folge.geberId)
    if (auswahl === undefined) continue

    const aktivePaare = folge.keyPairs
      .map((p) => ({ soll: getField(auswahl, p.fromField), toField: p.toField }))
      .filter((p) => p.soll !== '')

    if (aktivePaare.length === 0) continue

    gefiltert = true
    raus = raus.filter((row) =>
      aktivePaare.every((p) => p.soll === getField(row, p.toField)),
    )
  }
  return { rows: raus, gefiltert }
}

export function ersteZeileNachAuswahl(el: HTMLElement, rows: unknown[]): unknown {
  if (folgenAusAttribut(el).length === 0) return rows[0]
  const { rows: passende, gefiltert } = zeilenNachAuswahl(el, rows)
  return gefiltert ? passende[0] : undefined
}
