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
  return { titel, farbwelt, wert: '', auffang: 'nein', unterteilungsFeld: '', unterteilungen: [] }
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

function platzMitWert(wert: string, eintraege: readonly { titel: string; wert: string }[]): number {
  const gesucht = wert.trim().toLowerCase()
  if (gesucht === '') return -1
  return eintraege.findIndex((e) => zuordnungsWert(e).trim().toLowerCase() === gesucht)
}

// Unbekannte Werte fallen in die Auffangspalte, ohne sie in die erste; in der
// Spalte ebenso in die erste Unterteilung.
export function ablageFuer(
  spalten: readonly TafelSpalte[],
  spaltenFeld: string,
  lies: (feld: string) => string,
): Ablage {
  const platz = spaltenFeld === '' ? -1 : platzMitWert(lies(spaltenFeld), spalten)
  const auffang = spalten.findIndex((s) => s.auffang === 'ja')
  const spalte = platz >= 0 ? platz : Math.max(auffang, 0)
  const unter = unterteilungenVon(spalten[spalte])
  if (unter.length === 0) return { spalte, unterteilung: -1 }
  return { spalte, unterteilung: Math.max(platzMitWert(lies(spalten[spalte].unterteilungsFeld), unter), 0) }
}

// Ob die Felder einer Zeile genau diese Ablage nennen; die Auffangspalte zaehlt
// nicht: eine Verschiebung ist erst bestaetigt, wenn das ERP den Wert traegt.
export function zeigtAuf(
  spalten: readonly TafelSpalte[],
  spaltenFeld: string,
  ablage: Ablage,
  lies: (feld: string) => string,
): boolean {
  const gleich = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()
  const spalte = spalten[ablage.spalte]
  if (spaltenFeld === '' || !spalte || !gleich(lies(spaltenFeld), zuordnungsWert(spalte))) return false
  const unter = unterteilungenVon(spalte)[ablage.unterteilung]
  return !unter || gleich(lies(spalte.unterteilungsFeld), zuordnungsWert(unter))
}

export function ablageSchluessel(ablage: Ablage): string {
  return `${ablage.spalte}:${ablage.unterteilung}`
}

// Jede Stelle, an die eine Karte kann: je Spalte ihre Unterteilungen, sonst
// die Spalte selbst.
export function alleAblagen(spalten: readonly TafelSpalte[]): Ablage[] {
  return spalten.flatMap((s, spalte) => {
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

// Was „Karte verschoben“ als VALUE und ZIMMER an die Kette gibt.
export function ablageWerte(spalten: readonly TafelSpalte[], ablage: Ablage): { VALUE: string; ZIMMER: string } {
  const spalte = spalten[ablage.spalte]
  const unter = unterteilungenVon(spalte)[ablage.unterteilung]
  return { VALUE: zuordnungsWert(spalte), ZIMMER: unter ? zuordnungsWert(unter) : '' }
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
      jaNeinEigenschaft('auffang', 'Auffangspalte', 'Einträge ohne passenden Wert landen hier.', {
        einzigUnterGeschwistern: true,
      }),
      {
        schluessel: 'unterteilungsFeld',
        name: 'Unterteilen nach',
        beschreibung: 'Datenfeld, nach dem die Spalte unterteilt wird, z. B. Mitarbeiter oder Raum. Unbekannte Werte landen in der ersten Unterteilung.',
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
