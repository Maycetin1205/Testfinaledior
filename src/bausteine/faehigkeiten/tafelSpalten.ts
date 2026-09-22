// Faehigkeit Tafelspalten: die Plaetze einer Kanban-Tafel, in Spalten gefasst,
// ihre Bedienung im Inspector und wohin eine Zeile gehoert.
import { jaNeinEigenschaft, type Eigenschaft } from '../../kern/maske/eigenschaft'
import { farbweltEigenschaft, farbweltWert, type FarbweltWert } from './farbwelt'

// Ein Platz ist eine Stelle, an der eine Karte liegt: der Wert steht dann im
// Feld „Karten liegen nach“, der Name nur auf dem Bildschirm.
export interface Platz {
  name: string
  wert: string
  versteckt: 'ja' | 'nein'
}

// Eine Spalte ist nur Ueberschrift und Farbe ueber ihren Plaetzen.
export interface TafelSpalte {
  titel: string
  farbwelt: FarbweltWert
  // Beschriftung des Knopfs auf jeder Karte dieser Spalte; leer: kein Knopf.
  knopf: string
  plaetze: Platz[]
}

export interface Ablage {
  spalte: number
  platz: number
}

function platz(name: string, wert: string): Platz {
  return { name, wert, versteckt: 'nein' }
}

function spalte(titel: string, farbwelt: FarbweltWert, wert: string): TafelSpalte {
  return { titel, farbwelt, knopf: '', plaetze: [platz(titel, wert)] }
}

export function standardTafelSpalten(): TafelSpalte[] {
  return [spalte('Offen', 'neutral', ''), spalte('In Arbeit', 'info', 'In Arbeit'), spalte('Fertig', 'success', 'Fertig')]
}

function text(v: unknown, standard: string): string {
  return typeof v === 'string' ? v : standard
}

function alsPlatz(x: unknown, i: number): Platz {
  const o = x && typeof x === 'object' ? x as Record<string, unknown> : {}
  return { ...platz(text(o.name, `Platz ${i + 1}`), text(o.wert, '')), versteckt: o.versteckt === 'ja' ? 'ja' : 'nein' }
}

// Der erste Stand dieses Zweigs fuehrte je Spalte einen Wert, eine Auffang-
// Marke und Unterteilungen; eine so gesicherte Tafel laedt als Plaetze weiter.
function plaetzeAusAltem(o: Record<string, unknown>, titel: string): Platz[] {
  const unter = Array.isArray(o.unterteilungen) ? o.unterteilungen : []
  if (text(o.unterteilungsFeld, '') !== '' && unter.length > 0) {
    return unter.map((u, i) => {
      const e = u && typeof u === 'object' ? u as Record<string, unknown> : {}
      const name = text(e.titel, `Platz ${i + 1}`)
      return platz(name, text(e.wert, '').trim() || name)
    })
  }
  const wert = text(o.wert, '').trim()
  return [{ ...platz(titel, wert !== '' || o.auffang === 'ja' ? wert : titel), versteckt: o.versteckt === 'ja' ? 'ja' : 'nein' }]
}

function alsSpalte(x: unknown): TafelSpalte {
  const o = x && typeof x === 'object' ? x as Record<string, unknown> : {}
  const titel = text(o.titel, 'Neue Spalte')
  const plaetze = Array.isArray(o.plaetze) ? o.plaetze.map(alsPlatz) : plaetzeAusAltem(o, titel)
  return {
    titel,
    farbwelt: farbweltWert(text(o.farbwelt, 'info')),
    knopf: text(o.knopf, ''),
    plaetze: plaetze.length > 0 ? plaetze : [platz(titel, '')],
  }
}

// Eine Tafel ohne Spalte haette keinen Platz fuer eine einzige Karte.
export function tafelSpaltenLesen(v: unknown): TafelSpalte[] {
  let roh = v
  if (typeof roh === 'string') {
    try { roh = JSON.parse(roh) } catch { roh = null }
  }
  const spalten = Array.isArray(roh) ? roh.map(alsSpalte) : standardTafelSpalten()
  return spalten.length > 0 ? spalten : [spalte('Neue Spalte', 'neutral', '')]
}

function gleich(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function alle(spalten: readonly TafelSpalte[]): Ablage[] {
  return spalten.flatMap((s, si) => s.plaetze.map((_, pi) => ({ spalte: si, platz: pi })))
}

function platzVon(spalten: readonly TafelSpalte[], ablage: Ablage): Platz | undefined {
  return spalten[ablage.spalte]?.plaetze[ablage.platz]
}

// Genau ein Platz fuer jeden Wert. Was kein Platz kennt, liegt beim Platz mit
// leerem Wert („noch nichts eingetragen“), und gibt es den nicht, beim ersten.
export function ablageFuer(spalten: readonly TafelSpalte[], wert: string): Ablage {
  const ablagen = alle(spalten)
  const wertVon = (a: Ablage): string => platzVon(spalten, a)?.wert ?? ''
  return ablagen.find((a) => wertVon(a).trim() !== '' && gleich(wertVon(a), wert))
    ?? ablagen.find((a) => wertVon(a).trim() === '')
    ?? { spalte: 0, platz: 0 }
}

// Eine Verschiebung gilt erst als bestaetigt, wenn das Feld genau den Wert des
// Ziel-Platzes traegt; dass die Karte nur als Unbekannte dort liegt, zaehlt nicht.
export function traegtWert(spalten: readonly TafelSpalte[], ablage: Ablage, wert: string): boolean {
  const p = platzVon(spalten, ablage)
  return p !== undefined && gleich(p.wert, wert)
}

export function ablageSchluessel(ablage: Ablage): string {
  return `${ablage.spalte}:${ablage.platz}`
}

export function istSichtbar(spalten: readonly TafelSpalte[], ablage: Ablage): boolean {
  return platzVon(spalten, ablage)?.versteckt !== 'ja'
}

export function sichtbarePlaetze(spalte: TafelSpalte): number[] {
  return spalte.plaetze.flatMap((p, i) => (p.versteckt === 'ja' ? [] : [i]))
}

// Jede Stelle, an die eine Karte kann, fuer die Zielwahl ohne Zeiger.
export function alleAblagen(spalten: readonly TafelSpalte[]): Ablage[] {
  return alle(spalten).filter((a) => istSichtbar(spalten, a))
}

export function ablageName(spalten: readonly TafelSpalte[], ablage: Ablage): string {
  const s = spalten[ablage.spalte]
  const p = platzVon(spalten, ablage)
  if (!s || !p) return ''
  return sichtbarePlaetze(s).length > 1 ? `${s.titel} / ${p.name}` : s.titel
}

// Was jede Verschiebung an „Karte verschoben“ gibt, ob gezogen, geklickt oder
// gewaehlt: Wert und Name des Ziel-Platzes.
export function ablageWerte(spalten: readonly TafelSpalte[], ablage: Ablage): { VALUE: string; PLATZ: string } {
  const p = platzVon(spalten, ablage)
  return { VALUE: p?.wert.trim() ?? '', PLATZ: p?.name ?? '' }
}

// Der Knopf auf der Karte ist nur eine Abkuerzung: naechste Spalte mit einem
// sichtbaren Platz, dort der erste freie, sonst der erste.
export function naechsteAblage(
  spalten: readonly TafelSpalte[],
  von: Ablage,
  belegt: (ablage: Ablage) => number,
): Ablage | null {
  const si = spalten.findIndex((s, i) => i > von.spalte && sichtbarePlaetze(s).length > 0)
  if (si < 0) return null
  const plaetze = sichtbarePlaetze(spalten[si])
  const frei = plaetze.find((pi) => belegt({ spalte: si, platz: pi }) === 0)
  return { spalte: si, platz: frei ?? plaetze[0] }
}

export function tafelSpaltenEigenschaft(): Eigenschaft {
  return {
    schluessel: 'spalten',
    name: 'Spalten und Plätze',
    beschreibung: 'Die Spalten der Tafel von links nach rechts; in jeder Spalte ihre Plätze.',
    art: 'eintraege',
    abschnitt: 'inhalt',
    bearbeitung: 'inspector',
    min: 1,
    eintragName: 'Spalte',
    titelSchluessel: 'titel',
    neuerEintrag: () => ({ ...spalte('Neue Spalte', 'neutral', '') }),
    eintrag: [
      { schluessel: 'titel', name: 'Überschrift', beschreibung: 'Steht oben über der Spalte.', art: 'text' },
      farbweltEigenschaft('farbwelt', 'Bedeutung der Spalte — bestimmt ihre Farbe.'),
      {
        schluessel: 'knopf',
        name: 'Knopf auf den Karten',
        beschreibung: 'z. B. „Anmelden →“',
        zusatz: 'Schiebt die Karte in die nächste Spalte, dort auf den ersten freien Platz. Leer: kein Knopf.',
        art: 'text',
      },
      {
        schluessel: 'plaetze',
        name: 'Plätze',
        beschreibung: 'Wo in dieser Spalte eine Karte liegen kann.',
        art: 'eintraege',
        min: 1,
        eintragName: 'Platz',
        titelSchluessel: 'name',
        neuerEintrag: () => ({ ...platz('Neuer Platz', '') }),
        eintrag: [
          {
            schluessel: 'name',
            name: 'Name',
            beschreibung: 'Steht auf dem Bildschirm, z. B. „Zimmer 1“.',
            zusatz: 'Hat die Spalte nur einen Platz, steht nur die Überschrift der Spalte da.',
            art: 'text',
          },
          {
            schluessel: 'wert',
            name: 'Wert im Feld',
            beschreibung: 'z. B. „Behandlungszimmer 1“',
            zusatz: 'Was SoftEngine im Feld „Karten liegen nach“ kennt. Leer: hier liegen Karten ohne Wert und alle, deren Wert kein Platz kennt.',
            art: 'text',
          },
          jaNeinEigenschaft('versteckt', 'In der Maske nicht zeigen', 'Karten mit diesem Wert erscheinen nicht, etwa „Erledigt“. Im Editor bleibt der Platz blass sichtbar.'),
        ],
      },
    ],
  }
}
