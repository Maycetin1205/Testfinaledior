// Das Umfeld einer Erfassungszeile: Zellenziele, Hilfsquellen, Fensterspalten.
import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { Vorschlag } from '../shared/vorschlagListe'
import { eingabeStelleTpl, zellenKlasse } from '../shared/zellenEingabe'
import { fensterSpaltenOder } from '../tabelle/nachschlagen'
import { alsZahl } from '../tabelle/sortierung'
import { ZELLE_PLATZHALTER, type Spalte } from '../tabelle/spalten'
import type { ErfassungsSpalte } from './erfassungsSpalte'
import { zerlegeBindung } from '../../core/blocks/BlockDefinition'
import type { Berechnung } from '../../core/data/berechnung'
import type { SchluesselPaar } from '../../core/data/sourceLinks'
import { getField } from '../../softengine/data'

export interface ErfassungsLage {
  spalten: readonly Spalte[]
  plaetze: readonly number[]

  quelleId: string

  cols: Readonly<Record<string, string>>

  imEditor: boolean

  wert: (index: number) => string

  automatisch: (index: number) => boolean

  tippSpalte: number
  vorschlaege: readonly Vorschlag[]
  marke: number

  listeNachOben: boolean

  // Was an dieser Zeile gerade nicht aufgeht; steht ueber der Zeile.
  hinweise: readonly string[]
}

export interface ErfassungsHandeln {
  tippen: (index: number, text: string) => void
  taste: (index: number, e: KeyboardEvent) => void
  verlassen: (index: number) => void

  waehleVorschlag: (listenIndex: number) => void
  setzeMarke: (listenIndex: number) => void
}

export function erfassungsZeileTpl(
  lage: ErfassungsLage,
  tun: ErfassungsHandeln,
): TemplateResult {
  return html`<div class="zeile erfassung" role="row" style=${styleMap(lage.cols)}>
    ${lage.imEditor || lage.hinweise.length === 0 ? nothing : html`<div class="rechen-hinweis" role="status">${lage.hinweise.join(' ')}</div>`}
    ${lage.spalten.map((spalte, i) => {
      if (lage.imEditor) {
        return html`<div
          class=${spalte.versteckt === true ? 'versteckt' : nothing}
          role="cell"
        ><span class="zell-beschriftung">${spalte.titel || ZELLE_PLATZHALTER}</span></div>`
      }
      const platz = lage.plaetze[i]
      // Eine freie Zelle hat nichts nachzuschlagen; ihre Liste bliebe leer.
      const frei = zellenzielVon(spalte, lage.quelleId).art === 'frei'
      const liste = !frei && lage.tippSpalte === platz
      const wert = lage.wert(platz)
      // Dieselbe Zahlenkante wie in einer gebuchten Zeile.
      return html`<div
        class=${alsZahl(wert) !== null ? 'zahl' : nothing}
        role="cell"
      >${eingabeStelleTpl({
        wert,
        titel: spalte.titel,
        platzhalter: spalte.titel,
        klasse: zellenKlasse(lage.automatisch(platz) ? 'automatisch' : 'ruhig'),
        halterKlasse: 'zell-halter',
        platz,
        vorschlaege: liste ? lage.vorschlaege : [],
        marke: lage.marke,
        listeNachOben: lage.listeNachOben,
      }, {
        tippen: (text) => tun.tippen(platz, text),
        taste: (e) => tun.taste(platz, e),
        verlassen: () => tun.verlassen(platz),
        waehleVorschlag: (i2) => tun.waehleVorschlag(i2),
        setzeMarke: (i2) => tun.setzeMarke(i2),
      })}</div>`
    })}
  </div>`
}

export type Zellenart = 'frei' | 'eigen' | 'verknuepft'

export interface Zellenziel {
  art: Zellenart

  quelleId: string

  code: string
}

export interface ErfassungsUmfeld {
  baustein?: HTMLElement
  spalten: readonly ErfassungsSpalte[]

  // Die Berechnungen der Zeile: jede eine Gruppe, die sich nach jeder ihrer
  // Groessen aufloesen laesst.
  berechnungen: readonly Berechnung[]

  quelleId: string

  paareZu: (quelleId: string) => readonly SchluesselPaar[]

  partnerVon: (quelleId: string) => string
}

export function zellenzielVon(
  spalte: ErfassungsSpalte | undefined,
  tabellenQuelleId: string,
): Zellenziel {
  const fuell = (spalte?.fuellFeld ?? '').trim()
  const feld = fuell !== '' ? fuell : (spalte?.feld ?? '').trim()
  if (feld === '') return { art: 'frei', quelleId: '', code: '' }
  const { quelleId, code } = zerlegeBindung(feld)
  if (quelleId === '') return { art: 'eigen', quelleId: tabellenQuelleId, code }
  return { art: 'verknuepft', quelleId, code }
}

export function zielIn(umfeld: ErfassungsUmfeld, index: number): Zellenziel {
  return zellenzielVon(umfeld.spalten[index], umfeld.quelleId)
}

export function verknuepfteQuellenIn(umfeld: ErfassungsUmfeld): string[] {
  const raus: string[] = []
  for (const spalte of umfeld.spalten) {
    const ziel = zellenzielVon(spalte, umfeld.quelleId)
    if (ziel.art !== 'verknuepft' || ziel.quelleId === '') continue
    if (!raus.includes(ziel.quelleId)) raus.push(ziel.quelleId)
  }
  return raus
}

export function anzeigeSpalteIn(
  umfeld: ErfassungsUmfeld,
  index: number,
): { titel: string; code: string } | undefined {
  const ziel = zielIn(umfeld, index)
  if (ziel.quelleId === '' || ziel.code === '') return undefined
  for (let i = 0; i < umfeld.spalten.length; i++) {
    if (i === index) continue
    const spalte = umfeld.spalten[i]
    const anderes = zellenzielVon(spalte, umfeld.quelleId)
    if (anderes.quelleId !== ziel.quelleId) continue
    if (anderes.code === '' || anderes.code === ziel.code) continue
    return { titel: spalte.titel, code: anderes.code }
  }
  return undefined
}

export function fensterSpaltenIn(umfeld: ErfassungsUmfeld, index: number): Spalte[] {
  return fensterSpaltenOder(
    umfeld.spalten[index]?.fensterSpalten,
    () => automatikSpaltenIn(umfeld, index),
  )
}

// Die Automatik der Tabellenspalte: alle Spalten, die auf dieselbe Hilfsquelle
// zeigen, jedes Feld einmal.
function automatikSpaltenIn(umfeld: ErfassungsUmfeld, index: number): Spalte[] {
  const ziel = zielIn(umfeld, index)
  if (ziel.art !== 'verknuepft' || ziel.quelleId === '' || ziel.code === '') return []
  const raus: Spalte[] = []
  for (const spalte of umfeld.spalten) {
    const anderes = zellenzielVon(spalte, umfeld.quelleId)
    if (anderes.quelleId !== ziel.quelleId || anderes.code === '') continue
    if (raus.some((s) => s.feld === anderes.code)) continue
    raus.push({ kennung: `feld:${anderes.code}`, titel: spalte.titel, feld: anderes.code })
  }
  return raus
}

export function passendeSaetze(
  paare: readonly SchluesselPaar[],
  schluesselWert: (feld: string) => string | undefined,
  kandidaten: readonly unknown[],
): unknown[] {
  const bekannte = paare
    .map((p) => ({ toField: p.toField, soll: schluesselWert(p.fromField) }))
    .filter((b): b is { toField: string; soll: string } => b.soll !== undefined)
  if (bekannte.length === 0) return [...kandidaten]
  return kandidaten.filter((satz) => bekannte.every(
    (b) => b.soll !== '' && b.soll === getField(satz, b.toField),
  ))
}
