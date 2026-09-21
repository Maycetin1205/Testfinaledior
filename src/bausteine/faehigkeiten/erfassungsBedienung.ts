// Die Zellen der Erfassungszeile: zeichnen, Tasten annehmen, Fenster oeffnen.
import type { TemplateResult } from 'lit'
import { oeffneNachschlagen } from './nachschlagen'
import { tasteVon } from './vorschlagStand'
import type { ErfassungsLauf } from './erfassungsLauf'
import {
  erfassungsZeileTpl,
  fensterSpaltenIn,
  zielIn,
  type ErfassungsUmfeld,
} from './erfassungsZeile'
import type { Spaltensicht } from './spalten'

export interface ErfassungsWirt {
  baustein: HTMLElement

  lauf: ErfassungsLauf

  umfeld: () => ErfassungsUmfeld

  melde: () => void

  fokussiere: (index: number) => void

  erfasseZeile: () => boolean

  // Ohne Kopfzeile ist die Zelle der einzige Ort, an dem der Titel stehen kann.
  titelInZelle: () => boolean

  // Ein Mass fuer alle Suchfenster der Erfassung, egal aus welcher Spalte.
  fensterMass: () => { breite: number; hoehe: number }
}

function waehle(wirt: ErfassungsWirt, index: number, listenIndex: number): void {
  const treffer = wirt.lauf.vorschlaege[listenIndex]
  if (treffer === undefined) return
  wirt.lauf.uebernimm(wirt.umfeld(), index, treffer.satz)
  wirt.melde()
}

function fenster(wirt: ErfassungsWirt, index: number): void {
  const umfeld = wirt.umfeld()
  const spalte = umfeld.spalten[index]
  const ziel = zielIn(umfeld, index)
  if (spalte === undefined || ziel.quelleId === '' || ziel.code === '') return
  const spalten = fensterSpaltenIn(umfeld, index)
  oeffneNachschlagen({
    el: wirt.baustein,
    stelle: spalte.kennung,
    quelleId: ziel.quelleId,
    speicherFeld: ziel.code,
    speicherTitel: spalte.titel,
    spalten,
    titel: spalte.titel,
    ...wirt.fensterMass(),
    eintraege: wirt.lauf.eintraege(umfeld, index),
    // Esc oder eine Wahl im Fenster: die Schreibmarke steht danach wieder in
    // dieser Zelle, nicht im Nirgendwo.
    rueckFokus: () => wirt.fokussiere(index),
    suchtext: wirt.lauf.wertVon(umfeld, index),
    onUebernehmen: (_anzeige, _wert, satz) => {
      wirt.lauf.uebernimm(wirt.umfeld(), index, satz)
      wirt.melde()
      springe(wirt, index, 'Enter')
    },
  })
}

export function springe(wirt: ErfassungsWirt, index: number, taste: string): boolean {
  const umfeld = wirt.umfeld()
  if (taste === 'Tab') {
    const naechste = wirt.lauf.nachbarPlatz(umfeld, index, 1)
    if (naechste !== -1) {
      wirt.fokussiere(naechste)
      return true
    }
    return wirt.erfasseZeile()
  }
  const ziel = wirt.lauf.naechsteLeere(umfeld, index)
  if (ziel !== -1) wirt.fokussiere(ziel)
  else if (taste === 'Enter') wirt.erfasseZeile()
  return true
}

function taste(wirt: ErfassungsWirt, index: number, e: KeyboardEvent): void {
  if (e.key === 'F5') e.preventDefault()
  // Shift+Tab setzt den Fokus selbst zurueck: der Browser-Weg durch die
  // Schatten-Wurzeln ist nicht verlaesslich.
  if (e.key === 'Tab' && e.shiftKey) {
    const vorige = wirt.lauf.nachbarPlatz(wirt.umfeld(), index, -1)
    if (vorige === -1) return
    e.preventDefault()
    wirt.fokussiere(vorige)
    wirt.melde()
    return
  }
  const folge = wirt.lauf.entscheideTaste(wirt.umfeld(), index, tasteVon(e))
  if (folge === 'nichts') {
    if (e.key === 'Enter') e.preventDefault()
    return
  }
  let behalte = true
  if (folge === 'uebernehmen') {
    waehle(wirt, index, wirt.lauf.marke)
    behalte = springe(wirt, index, e.key)
  } else if (folge === 'fenster') fenster(wirt, index)
  else if (folge === 'liste-auf') wirt.lauf.oeffneListe(index)
  else if (folge === 'weiter') behalte = springe(wirt, index, e.key)
  else if (folge === 'leeren') wirt.lauf.leere(wirt.umfeld(), index)
  if (behalte) e.preventDefault()
  wirt.melde()
}

export function erfassungsZeileFuer(
  wirt: ErfassungsWirt,
  cols: Readonly<Record<string, string>>,
  listeNachOben: boolean,

  // Gezeichnet wird die gefilterte Sicht, die Werte holt der Lauf ueber den
  // vollen Platz.
  sicht: Spaltensicht,
): TemplateResult {
  const umfeld = wirt.umfeld()
  return erfassungsZeileTpl({
    spalten: sicht.spalten,
    plaetze: sicht.plaetze,
    quelleId: umfeld.quelleId,
    cols,
    titelInZelle: wirt.titelInZelle(),
    imEditor: wirt.baustein.hasAttribute('data-ff-editor'),
    wert: (i) => wirt.lauf.wertVon(umfeld, i),
    automatisch: (i) => wirt.lauf.istAutomatisch(umfeld, i),
    tippSpalte: wirt.lauf.tippSpalte,
    vorschlaege: wirt.lauf.vorschlaege,
    marke: wirt.lauf.marke,
    listeNachOben,
    hinweise: wirt.lauf.hinweise,
  }, {
    tippen: (i, text) => {
      wirt.lauf.tippe(i, text)
      wirt.melde()
    },
    taste: (i, e) => taste(wirt, i, e),
    verlassen: (i) => {
      wirt.lauf.verlasse(i)
      wirt.melde()
    },
    waehleVorschlag: (listenIndex) => waehle(wirt, wirt.lauf.tippSpalte, listenIndex),
    setzeMarke: (listenIndex) => {
      wirt.lauf.setzeMarke(listenIndex)
      wirt.melde()
    },
  })
}
