// Das Nachschlage-Fenster: dieselbe Flaeche fuer die Editor-Lupe und die Laufzeit-Wahl.
import { html, render, type TemplateResult } from 'lit'
import type { ListenBindung } from '../../kern/maske/listenBindung'
import { getField } from '../../softengine/data'
import { laufzeitQuelle, zeilenDerQuelle } from '../../softengine/laufzeitQuellen'
import { meldeFehler } from '../../softengine/meldung'
import { zeilenNachAuswahl } from '../shared/auswahl'
import {
  DIALOG_GROESSE_EVENT,
  DIALOG_RAHMEN_TAG,
  type DialogGroesseDetail,
  type DialogRahmen,
} from '../shared/DialogRahmen'
import { coerceSpalten, STANDARD_TITEL, type Spalte } from './spalten'
import { nachschlagKennung, nachschlagSpalten } from './nachschlagStand'
import type { TabelleBlock } from './TabelleBlock'
import {
  ZEILE_AKTIVIERT_EVENT,
  type ZeileAktiviertDetail,
} from './zeilenAktivierung'

export const FENSTER_BREITE = 520
export const FENSTER_HOEHE = 380

// Das Startmass ist fuer ZWEI Spalten gemacht; die Erfassungszeile gibt alle
// Spalten ihrer Quelle mit, das koennen sechs sein.
export function fensterBreiteFuer(spalten: number): number {
  return Math.min(900, Math.max(FENSTER_BREITE, 160 + 180 * spalten))
}

// Die Spalten des Fensters wohnen am FELD und werden an der Lupe eingestellt.
// Leer heisst Automatik: eine Spalte, mit eigenem Anzeigefeld zwei.
export const NACHSCHLAG_SPALTEN_BINDUNG: ListenBindung = {
  prop: 'nachschlagSpalten',
  titelKey: 'titel',
  feldKey: 'feld',
  standardTitel: STANDARD_TITEL,
  quelleProp: 'nachschlagQuelle',
}

export function coerceNachschlagSpalten(v: unknown): Spalte[] {
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return []
    }
  }
  return Array.isArray(v) && v.length > 0 ? coerceSpalten(v) : []
}

// Die eine Regel des Suchfensters: vom Bauer gestellte Spalten schlagen die
// Automatik, eine leere Liste ist keine Stellung. Formularfeld und
// Tabellenspalte fragen hier, jeder mit seiner eigenen Automatik.
export function fensterSpaltenOder(gestellt: unknown, automatik: () => Spalte[]): Spalte[] {
  const eigene = coerceNachschlagSpalten(gestellt)
  return eigene.length > 0 ? eigene : automatik()
}

export interface NachschlagenArgs {
  stelle?: string
  el: HTMLElement
  quelleId: string
  speicherFeld: string
  speicherTitel: string

  spalten: readonly Spalte[]
  titel: string

  breite: number
  hoehe: number
  onUebernehmen: (anzeige: string, wert: string, satz: unknown) => void

  // Gesetzt: der Aufrufer hat seine Eintraege schon, dann zeigt das Fenster genau
  // dieselben Saetze wie die Vorschlagsliste daneben.
  eintraege?: readonly Eintrag[]

  // Wohin der Fokus nach dem Schliessen geht: ein Element oder ein Ruf, der ihn
  // setzt. Ohne Angabe die Lupe des Bausteins; die Erfassungszeile hat keine und
  // schickt ihn in die Zelle zurueck, aus der F5 kam.
  rueckFokus?: HTMLElement | (() => void) | null

  // Was der Bediener schon getippt hat; es steht beim Aufmachen in der Suche des
  // Fensters.
  suchtext?: string

  // Nur der Editor: dieselbe Flaeche wie beim Bediener, aber ohne ERP-Daten
  // (Striche in den Zeilen) und mit den zwei Zieh-Anfassern am Rand. Gesetzt
  // heisst zugleich: der Baustein zeichnet als Editor-Element.
  imEditor?: boolean

  // Was der gezogene Rand schreiben soll. undefined = zurueck auf die
  // Automatik (Doppelklick auf den Anfasser).
  setzeMass?: (achse: 'breite' | 'hoehe', wert: number | undefined) => void
}

export interface Eintrag {
  anzeige: string
  wert: string

  satz: unknown
}

export interface NachschlagEinstellung {
  el: HTMLElement
  quelleId: string
  speicherFeld: string

  spalten: readonly Spalte[]
}

// Was im FELD steht, ist die erste Spalte des Fensters.
function anzeigeFeldVon(spalten: readonly Spalte[], speicherFeld: string): string {
  const erste = spalten[0]
  return erste === undefined ? speicherFeld : erste.feld
}

function nurEineSpalte(anzeigeFeld: string, speicherFeld: string): boolean {
  const anzeige = anzeigeFeld.trim()
  return anzeige === '' || anzeige === speicherFeld.trim()
}

export function nachschlagEintraege(
  rows: readonly unknown[],
  anzeigeFeld: string,
  speicherFeld: string,
): Eintrag[] {
  const anzeigeCode = anzeigeFeld.trim()
  const eintraege: Eintrag[] = []
  const einspaltig = nurEineSpalte(anzeigeFeld, speicherFeld)
  const gesehen = new Set<string>()
  for (const row of rows) {
    const wert = getField(row, speicherFeld).trim()
    const anzeige = anzeigeCode === '' ? wert : getField(row, anzeigeCode).trim()
    if (anzeige === '' && wert === '') continue
    if (einspaltig) {
      if (gesehen.has(wert)) continue
      gesehen.add(wert)
    }
    eintraege.push({ anzeige, wert, satz: row })
  }
  return eintraege
}

function fensterEintraege(
  el: HTMLElement,
  rows: unknown[],
  anzeigeFeld: string,
  speicherFeld: string,
): Eintrag[] {
  return nachschlagEintraege(zeilenNachAuswahl(el, rows).rows, anzeigeFeld, speicherFeld)
}

export type EintraegeErgebnis =
  | { ok: true; eintraege: Eintrag[] }
  | { ok: false; grund: 'unvollstaendig' | 'quelleFehlt' }

// Getrennt von holeEintraege: die Erfassungszeile braucht dieselben Saetze, aber
// NICHT die Auswahl-Folgen ihres Bausteins — die wuerden jeden Nachschlage-Satz
// wegfiltern.
export function quellenZeilen(quelleId: string): unknown[] | null {
  const quelle = laufzeitQuelle(quelleId)
  if (!quelle) return null
  return zeilenDerQuelle(quelle)
}

export function holeEintraege(e: NachschlagEinstellung): EintraegeErgebnis {
  if (e.quelleId === '' || e.speicherFeld === '') {
    return { ok: false, grund: 'unvollstaendig' }
  }
  const rows = quellenZeilen(e.quelleId)
  if (rows === null) return { ok: false, grund: 'quelleFehlt' }
  const anzeigeFeld = anzeigeFeldVon(coerceNachschlagSpalten([...e.spalten]), e.speicherFeld)
  return { ok: true, eintraege: fensterEintraege(e.el, rows, anzeigeFeld, e.speicherFeld) }
}

export function einzigenTrefferFinden(
  eintraege: readonly Eintrag[],
  feldLeer: boolean,
): Eintrag | null {
  return feldLeer && eintraege.length === 1 ? eintraege[0] : null
}

export function satzPasstZurAuswahl(el: HTMLElement, satz: unknown): boolean {
  const { rows, gefiltert } = zeilenNachAuswahl(el, [satz])
  return !gefiltert || rows.length > 0
}

export type VerlassenFolge = 'nichts' | 'leeren' | 'zurueck'

export function folgeBeimVerlassen(

  getippt: string,

  bestaetigteAnzeige: string,
  bestaetigterWert: string,
): VerlassenFolge {
  if (getippt === '') {
    return bestaetigteAnzeige === '' && bestaetigterWert === '' ? 'nichts' : 'leeren'
  }
  return getippt === bestaetigteAnzeige ? 'nichts' : 'zurueck'
}

// Der Lit-Halter am document.body; ihn zu entfernen raeumt Fenster und Listener ab.
let offen: HTMLElement | null = null
let offenFuer: HTMLElement | null = null
let rueckFokus: HTMLElement | (() => void) | null = null

function lupeVon(el: HTMLElement): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('.lupe') ?? null
}

function schliesse(mitFokus = true): void {
  const ziel = mitFokus ? rueckFokus : null
  rueckFokus = null
  offen?.remove()
  offen = null
  offenFuer = null
  if (typeof ziel === 'function') ziel()
  else ziel?.focus()
}

// Stirbt das Feld, darf sein Fenster nicht als Waise am document.body
// weiterleben — samt keydown-Listener des Dialograhmens.
export function schliesseNachschlagenFuer(el: HTMLElement): void {
  if (offenFuer === el) schliesse(false)
}

type SpaltenQuelle = Pick<NachschlagenArgs, 'speicherFeld' | 'speicherTitel'>

// Die Automatik: EINE Spalte, „Gespeichert wird". Wer mehr will, stellt sie an
// der Lupe ein; die erste davon ist dann, was im Feld steht.
export function automatikSpalten(args: SpaltenQuelle): Spalte[] {
  const titel = args.speicherTitel !== '' ? args.speicherTitel : 'Wert'
  return [{ kennung: `feld:${args.speicherFeld}`, titel, feld: args.speicherFeld }]
}

function laufzeitTabelleTpl(args: NachschlagenArgs, eintraege: readonly Eintrag[]): TemplateResult {
  const eigene = coerceNachschlagSpalten([...args.spalten])
  const spalten = nachschlagSpalten(fensterSpaltenOder(eigene, () => automatikSpalten(args)))

  // Im Editor gibt es keine Zeilen zu zeigen. bereitgestellteZeilen gar nicht
  // erst zu setzen ist der Unterschied zwischen „Striche" und „Diese Quelle hat
  // keine Saetze": erst eine Lieferung setzt datenGeliefert.
  if (args.imEditor === true) {
    return html`<ff-tabelle
      data-ff-editor
      fuellt
      suche="ja"
      spaltenwahl="ja"
      style="--se-r-lg:0px"
      .besitz=${'provided'}
      .spalten=${spalten}
    ></ff-tabelle>`
  }

  const einspaltig = nurEineSpalte(
    anzeigeFeldVon(eigene, args.speicherFeld),
    args.speicherFeld,
  )
  // Das Fenster IST eine Tabelle: Spalten wegnehmen und sortieren gilt auch hier,
  // und beides ueberlebt das Schliessen.
  return html`<ff-tabelle
    data-ff-block-id=${nachschlagKennung(args.el, args.stelle)}
    fuellt
    suche="ja"
    spaltenwahl="ja"
    style="--se-r-lg:0px"
    .besitz=${'provided'}
    .spalten=${spalten}
    .leerText=${'Diese Quelle hat keine Sätze.'}
    .bereitgestellteZeilen=${eintraege.map((e) => ({
      rohzeile: e.satz,
      zellen: eigene.length > 0
        ? eigene.map((s) => (s.feld === '' ? '' : getField(e.satz, s.feld)))
        : (einspaltig ? [e.wert] : [e.anzeige, e.wert]),
    }))}
  ></ff-tabelle>`
}

// Der Rahmen aendert sich nicht selbst. Waehrend des Ziehens setzen wir die
// Kante zur Ansicht direkt am Element; geschrieben wird EINMAL beim Loslassen,
// sonst laege nach einem Zug ein Dutzend Schritte in der Historie.
function verdrahteZiehen(dialog: DialogRahmen, args: NachschlagenArgs): void {
  dialog.addEventListener(DIALOG_GROESSE_EVENT, (event) => {
    const detail = (event as CustomEvent<DialogGroesseDetail>).detail
    if (detail.geste === 'standard') {
      args.setzeMass?.(detail.achse, undefined)
      return
    }
    if (detail.achse === 'breite') dialog.breite = detail.wert
    else dialog.hoehe = detail.wert
    if (detail.geste === 'ende') args.setzeMass?.(detail.achse, detail.wert)
  })
}

export function oeffneNachschlagen(args: NachschlagenArgs): void {
  let eintraege = args.eintraege
  // Im Editor gibt es keine Quelle zu befragen; das Fenster zeigt seine Form,
  // nicht seinen Inhalt.
  if (eintraege === undefined && args.imEditor !== true) {
    const ergebnis = holeEintraege(args)
    if (!ergebnis.ok) {
      meldeFehler(ergebnis.grund === 'unvollstaendig'
        ? 'Nachschlagen braucht an diesem Feld eine Quelle und „Gespeichert wird".'
        : 'Die Nachschlage-Quelle dieses Feldes ist in der Maske nicht vorhanden.')
      return
    }
    eintraege = ergebnis.eintraege
  }
  // Im Editor bleibt sie leer: es gibt keine Zeile, die man waehlen koennte.
  const gefunden = eintraege ?? []

  schliesse(false)

  const halter = document.createElement('div')
  halter.style.display = 'contents'
  render(html`<ff-dialog-rahmen
    viewport
    escape-schliesst
    data-ff-nachschlagen
    ?ziehbar=${args.imEditor === true}
    .titel=${args.titel !== '' ? args.titel : 'Nachschlagen'}
    .breite=${args.breite}
    .hoehe=${args.hoehe}
    @ff-dialog-schliessen=${() => schliesse()}
    @click=${(e: Event) => e.stopPropagation()}
  >${laufzeitTabelleTpl(args, gefunden)}</ff-dialog-rahmen>`, halter)

  const dialog = halter.querySelector<DialogRahmen>(DIALOG_RAHMEN_TAG)
  const tabelle = halter.querySelector<TabelleBlock>('ff-tabelle')
  if (dialog && args.imEditor === true) verdrahteZiehen(dialog, args)
  tabelle?.addEventListener(ZEILE_AKTIVIERT_EVENT, (event) => {
    const detail = (event as CustomEvent<ZeileAktiviertDetail>).detail
    const eintrag = gefunden[detail.rohIndex]
    if (!eintrag) return
    schliesse()
    args.onUebernehmen(eintrag.anzeige, eintrag.wert, eintrag.satz)
  })

  rueckFokus = args.rueckFokus ?? lupeVon(args.el)
  document.body.appendChild(halter)
  offen = halter
  offenFuer = args.el

  const mitgebracht = args.suchtext ?? ''
  if (tabelle && mitgebracht !== '') tabelle.setzeSuchtext(mitgebracht)

  if (dialog && tabelle) {
    void Promise.all([dialog.updateComplete, tabelle.updateComplete]).then(() => {
      if (dialog.isConnected) tabelle.fokussiereSuche()
    })
  }
}
