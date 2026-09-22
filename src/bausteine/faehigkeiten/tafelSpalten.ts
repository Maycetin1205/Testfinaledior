// Faehigkeit Tafelspalten: die Spaltenliste einer Kanban-Tafel mit ihren
// Unterteilungen, ihre Bedienung im Inspector und wohin eine Zeile gehoert.
import { jaNeinEigenschaft, type Eigenschaft } from '../../kern/maske/eigenschaft'
import { farbweltEigenschaft, farbweltWert, type FarbweltWert } from './farbwelt'

export interface Unterteilung {
  titel: string
  wert: string
}

export interface TafelSpalte {
  titel: string
  farbwelt: FarbweltWert
  wert: string
  auffang: 'ja' | 'nein'
  unterteilungsFeld: string
  unterteilungen: Unterteilung[]
  // Karten mit diesem Wert gehoeren hierher, erscheinen aber nicht: so wird
  // „Erledigt“ nicht zum Auffang.
  versteckt: 'ja' | 'nein'
  // Beschriftung des Knopfs auf jeder Karte dieser Spalte, der sie eine Spalte
  // weiterschiebt. Leer: kein Knopf.
  knopf: string
}

// Wo eine Karte liegt: in der Spalte selbst (unterteilung -1) oder in einer
// ihrer Unterteilungen.
export interface Ablage {
  spalte: number
  unterteilung: number
}

export const SPALTE_TITEL_STANDARD = 'Neue Spalte'
export const UNTERTEILUNG_TITEL_STANDARD = 'Neue Unterteilung'

function neueSpalte(titel = SPALTE_TITEL_STANDARD, farbwelt: FarbweltWert = 'info'): TafelSpalte {
  return { titel, farbwelt, wert: '', auffang: 'nein', unterteilungsFeld: '', unterteilungen: [], versteckt: 'nein', knopf: '' }
}

export function standardTafelSpalten(): TafelSpalte[] {
  return [neueSpalte('Offen', 'warning'), neueSpalte('In Arbeit', 'info'), neueSpalte('Fertig', 'success')]
}

function text(v: unknown, standard: string): string {
  return typeof v === 'string' ? v : standard
}

function alsUnterteilung(x: unknown): Unterteilung {
  const o = x && typeof x === 'object' ? x as Record<string, unknown> : {}
  return { titel: text(o.titel, UNTERTEILUNG_TITEL_STANDARD), wert: text(o.wert, '') }
}

function alsSpalte(x: unknown): TafelSpalte {
  const o = x && typeof x === 'object' ? x as Record<string, unknown> : {}
  return {
    titel: text(o.titel, SPALTE_TITEL_STANDARD),
    farbwelt: farbweltWert(text(o.farbwelt, 'info')),
    wert: text(o.wert, ''),
    auffang: o.auffang === 'ja' ? 'ja' : 'nein',
    unterteilungsFeld: text(o.unterteilungsFeld, ''),
    unterteilungen: Array.isArray(o.unterteilungen) ? o.unterteilungen.map(alsUnterteilung) : [],
    versteckt: o.versteckt === 'ja' ? 'ja' : 'nein',
    knopf: text(o.knopf, ''),
  }
}

// Eine Tafel ohne Spalte haette keinen Platz fuer eine einzige Karte.
export function tafelSpaltenLesen(v: unknown): TafelSpalte[] {
  let roh = v
  if (typeof roh === 'string') {
    try { roh = JSON.parse(roh) } catch { roh = null }
  }
  const spalten = Array.isArray(roh) ? roh.map(alsSpalte) : standardTafelSpalten()
  return spalten.length > 0 ? spalten : [neueSpalte()]
}

// Ohne Feld unterteilt nichts: die Unterteilungen bleiben gespeichert, liegen
// aber brach, bis ein Feld sagt, wonach sortiert wird.
export function unterteilungenVon(spalte: TafelSpalte): Unterteilung[] {
  return spalte.unterteilungsFeld === '' ? [] : spalte.unterteilungen
}

// Der Wert, den das ERP kennt. Der Titel ist Anzeige und gilt nur, solange
// niemand einen Wert gesetzt hat.
export function zuordnungsWert(eintrag: { titel: string; wert: string }): string {
  return eintrag.wert.trim() !== '' ? eintrag.wert.trim() : eintrag.titel
}

// Die Auffangspalte ohne eigenen Wert steht fuer „noch nichts eingetragen“:
// wer eine Karte dorthin legt, leert das Feld, statt den Titel zu schreiben.
function spaltenWert(spalte: TafelSpalte): string {
  return spalte.auffang === 'ja' && spalte.wert.trim() === '' ? '' : zuordnungsWert(spalte)
}

// Unterteilt eine Spalte nach demselben Feld, nach dem die Tafel einsortiert,
// traegt jede Unterteilung einen eigenen Wert dieses Felds („Behandlungszimmer
// 3“), und die Spalte sammelt sie alle.
function teiltImSelbenFeld(spalte: TafelSpalte, spaltenFeld: string): boolean {
  return spaltenFeld !== '' && spalte.unterteilungsFeld === spaltenFeld
}

function gleich(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function platzMitWert(wert: string, werte: readonly string[]): number {
  if (wert.trim() === '') return -1
  return werte.findIndex((w) => w.trim() !== '' && gleich(w, wert))
}

// Unbekannte Werte fallen in die Auffangspalte, ohne sie in die erste; in der
// Spalte ebenso in die erste Unterteilung.
export function ablageFuer(
  spalten: readonly TafelSpalte[],
  spaltenFeld: string,
  lies: (feld: string) => string,
): Ablage {
  const wert = spaltenFeld === '' ? '' : lies(spaltenFeld)
  let spalte = platzMitWert(wert, spalten.map(spaltenWert))
  if (spalte < 0) {
    for (const [i, s] of spalten.entries()) {
      if (!teiltImSelbenFeld(s, spaltenFeld)) continue
      const unter = platzMitWert(wert, s.unterteilungen.map(zuordnungsWert))
      if (unter >= 0) return { spalte: i, unterteilung: unter }
    }
    spalte = Math.max(spalten.findIndex((s) => s.auffang === 'ja'), 0)
  }
  const unter = unterteilungenVon(spalten[spalte])
  if (unter.length === 0) return { spalte, unterteilung: -1 }
  const feld = spalten[spalte].unterteilungsFeld
  return { spalte, unterteilung: Math.max(platzMitWert(lies(feld), unter.map(zuordnungsWert)), 0) }
}

// Ob die Felder einer Zeile genau diese Ablage nennen; die Auffangspalte zaehlt
// nur mit leerem Feld: eine Verschiebung ist erst bestaetigt, wenn das ERP den
// Wert traegt.
export function zeigtAuf(
  spalten: readonly TafelSpalte[],
  spaltenFeld: string,
  ablage: Ablage,
  lies: (feld: string) => string,
): boolean {
  const spalte = spalten[ablage.spalte]
  if (spaltenFeld === '' || !spalte) return false
  const werte = ablageWerte(spalten, spaltenFeld, ablage)
  if (!gleich(lies(spaltenFeld), werte.VALUE)) return false
  return werte.ZIMMER === '' || teiltImSelbenFeld(spalte, spaltenFeld)
    || gleich(lies(spalte.unterteilungsFeld), werte.ZIMMER)
}

export function ablageSchluessel(ablage: Ablage): string {
  return `${ablage.spalte}:${ablage.unterteilung}`
}

// Jede Stelle, an die eine Karte kann: je sichtbare Spalte ihre Unterteilungen,
// sonst die Spalte selbst.
export function alleAblagen(spalten: readonly TafelSpalte[]): Ablage[] {
  return spalten.flatMap((s, spalte) => {
    if (s.versteckt === 'ja') return []
    const unter = unterteilungenVon(s)
    return unter.length === 0
      ? [{ spalte, unterteilung: -1 }]
      : unter.map((_, unterteilung) => ({ spalte, unterteilung }))
  })
}

export function ablageName(spalten: readonly TafelSpalte[], ablage: Ablage): string {
  const spalte = spalten[ablage.spalte]
  const unter = unterteilungenVon(spalte)[ablage.unterteilung]
  return unter ? `${spalte.titel} / ${unter.titel}` : spalte.titel
}

// Was „Karte verschoben“ als VALUE und ZIMMER an die Kette gibt. VALUE ist
// immer der Wert, den das Feld „Einsortieren nach“ danach tragen muss.
export function ablageWerte(
  spalten: readonly TafelSpalte[],
  spaltenFeld: string,
  ablage: Ablage,
): { VALUE: string; ZIMMER: string } {
  const spalte = spalten[ablage.spalte]
  const unter = unterteilungenVon(spalte)[ablage.unterteilung]
  if (!unter) return { VALUE: spaltenWert(spalte), ZIMMER: '' }
  const zimmer = zuordnungsWert(unter)
  return { VALUE: teiltImSelbenFeld(spalte, spaltenFeld) ? zimmer : spaltenWert(spalte), ZIMMER: zimmer }
}

// Wohin der Knopf auf der Karte sie schiebt: in die naechste sichtbare Spalte,
// dort in die erste Unterteilung ohne Karte, sonst in die erste.
export function naechsteAblage(
  spalten: readonly TafelSpalte[],
  von: Ablage,
  belegt: (ablage: Ablage) => number,
): Ablage | null {
  const spalte = spalten.findIndex((s, i) => i > von.spalte && s.versteckt !== 'ja')
  if (spalte < 0) return null
  const unter = unterteilungenVon(spalten[spalte])
  if (unter.length === 0) return { spalte, unterteilung: -1 }
  const frei = unter.findIndex((_, unterteilung) => belegt({ spalte, unterteilung }) === 0)
  return { spalte, unterteilung: Math.max(frei, 0) }
}

// Der Inspector pflegt die Spalten als Liste; jede Spalte traegt ihre
// Unterteilungen als zweite Liste darin.
export function tafelSpaltenEigenschaft(): Eigenschaft {
  return {
    schluessel: 'spalten',
    name: 'Spalten',
    beschreibung: 'Die Spalten der Tafel, von links nach rechts.',
    art: 'eintraege',
    bearbeitung: 'inspector',
    min: 1,
    eintragName: 'Spalte',
    titelSchluessel: 'titel',
    neuerEintrag: () => ({ ...neueSpalte() }),
    eintrag: [
      { schluessel: 'titel', name: 'Titel', beschreibung: 'Überschrift der Spalte.', art: 'text' },
      farbweltEigenschaft('farbwelt', 'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Punkt).'),
      {
        schluessel: 'wert',
        name: 'Wert im ERP',
        beschreibung: 'Steht im Feld „Einsortieren nach“, wenn eine Karte hier liegt. Leer: der Titel.',
        art: 'text',
      },
      jaNeinEigenschaft('auffang', 'Auffangspalte', 'Einträge ohne passenden Wert landen hier. Ohne eigenen Wert leert das Hineinziehen das Feld.', {
        einzigUnterGeschwistern: true,
      }),
      jaNeinEigenschaft('versteckt', 'In der Maske ausblenden', 'Karten mit diesem Wert erscheinen nicht, etwa „Erledigt“. Im Editor bleibt die Spalte blass sichtbar.'),
      {
        schluessel: 'knopf',
        name: 'Knopf auf jeder Karte',
        beschreibung: 'Beschriftung, z. B. „Anmelden →“. Der Knopf schiebt die Karte in die nächste Spalte, dort in die erste freie Unterteilung. Leer: kein Knopf.',
        art: 'text',
      },
      {
        schluessel: 'unterteilungsFeld',
        name: 'Unterteilen nach',
        beschreibung: 'Datenfeld, nach dem die Spalte unterteilt wird, z. B. Mitarbeiter oder Raum. Ist es dasselbe Feld wie „Einsortieren nach“, gehört jeder Wert einer Unterteilung zu dieser Spalte (z. B. „Behandlungszimmer 1“ bis „4“). Unbekannte Werte landen in der ersten Unterteilung.',
        art: 'field',
      },
      {
        schluessel: 'unterteilungen',
        name: 'Unterteilungen',
        beschreibung: 'Je Wert des Feldes „Unterteilen nach“ eine Fläche in der Spalte.',
        art: 'eintraege',
        eintragName: 'Unterteilung',
        titelSchluessel: 'titel',
        neuerEintrag: () => ({ titel: UNTERTEILUNG_TITEL_STANDARD, wert: '' }),
        wenn: { schluessel: 'unterteilungsFeld', ungleich: '' },
        eintrag: [
          { schluessel: 'titel', name: 'Titel', beschreibung: 'Überschrift der Unterteilung.', art: 'text' },
          {
            schluessel: 'wert',
            name: 'Wert im ERP',
            beschreibung: 'Steht im Feld „Unterteilen nach“, wenn eine Karte hier liegt. Leer: der Titel.',
            art: 'text',
          },
        ],
      },
    ],
  }
}
