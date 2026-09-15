// Zeichnet Kopf, Zeilen und Fuss der Tabelle; Stand und Bedienung kommen von aussen.
import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { leerZustand } from '../shared/leerZustand'
import type { Zeilenschmuck } from '../shared/zeilenNaehte'
import { spaltenWahlTpl, type SpaltenWahlHandeln, type SpaltenWahlLage } from './spaltenWahl'
import { markiereTreffer } from './textMarke'
import { alsZahl } from './sortierung'
import { ZELLE_PLATZHALTER, type Spalte } from './spalten'
import { breitenGriffe, type BreitenWirt } from './spaltenBreite'
import { bewegeZeilenFokus, fokussiereErsteZeile, fokussiereSuchzeile } from './zeilenAktivierung'
import { datensatzText } from './tabelleAnsicht'

export interface KoerperLage {
  spalten: readonly Spalte[]

  // plaetze[j] ist der Platz der j-ten gezeichneten Spalte in der vollen
  // Liste; jeder Wert und jeder Zustand haengt am vollen Platz.
  plaetze: readonly number[]

  cols: Readonly<Record<string, string>>

  editable: boolean

  imEditor: boolean

  zeigeKopf: boolean

  spaltenwahlAn: boolean

  spaltenwahl: SpaltenWahlLage | null

  auswahlSemantik: boolean
  zeigeSuche: boolean
  suchtext: string

  sortSpalte: number
  sortAuf: boolean

  zeilen: readonly (number | null)[]

  wertVon: (rohIndex: number, platz: number) => string

  linealTakte: number | null

  hatQuelle: boolean
  auswahlIndex: number

  leer: boolean
  leerText: string

  schmuck: (rohIndex: number | null) => Zeilenschmuck

  unten: TemplateResult | typeof nothing
}

export interface KoerperHandeln {
  setzeSuchtext: (text: string) => void

  breiten: BreitenWirt

  // Im Editor liegt die Spalten-Bedienung als eigene Schicht darueber; hier
  // wird nur sortiert.
  klickKopf: (index: number) => void

  oeffneSpaltenwahl: (e: MouseEvent) => void
  spaltenwahl: SpaltenWahlHandeln

  aktiviereZeile: (rohIndex: number | null, ansichtIndex: number) => void

  zeileDoppelt: (rohIndex: number | null) => void
}

function lineal(lage: KoerperLage): TemplateResult | typeof nothing {
  if (lage.linealTakte === 0) return nothing
  const stil = lage.linealTakte === null
    ? lage.cols
    : {
        ...lage.cols,
        flex: '0 1 auto',
        height: `calc(var(--zeilen-hoehe) * ${lage.linealTakte})`,
      }
  return html`<div class="lineal" role="presentation" style=${styleMap(stil)}>
          ${lage.spalten.map(() => html`<div></div>`)}
        </div>`
}

function zeileTpl(
  lage: KoerperLage,
  tun: KoerperHandeln,
  rohIndex: number | null,
  ansichtIndex: number,
): TemplateResult {
  const aktivierbar = rohIndex !== null && !lage.imEditor
  const schmuck = lage.schmuck(rohIndex)
  return html`<div
    class="zeile${ansichtIndex % 2 === 1 ? ' zebra' : ''}${
      rohIndex !== null && lage.hatQuelle ? ' waehlbar' : ''}${
      rohIndex !== null && rohIndex === lage.auswahlIndex ? ' gewaehlt' : ''}${
      schmuck.klasse === '' ? '' : ' ' + schmuck.klasse}"
    role="row"
    data-status=${schmuck.status === '' ? nothing : schmuck.status}
    title=${schmuck.titel === '' ? nothing : schmuck.titel}
    data-ff-roh=${rohIndex ?? nothing}
    tabindex=${aktivierbar ? '0' : nothing}
    aria-selected=${lage.auswahlSemantik && rohIndex !== null
      ? String(rohIndex === lage.auswahlIndex)
      : nothing}
    style=${styleMap(lage.cols)}
    @click=${() => {
      tun.aktiviereZeile(rohIndex, ansichtIndex)
    }}
    @dblclick=${(e: MouseEvent) => {
      // Der Doppelklick gehoert der Zeile, in einer Eingabezelle dem Text.
      if ((e.target as HTMLElement).closest('.zell-eingabe')) return
      tun.zeileDoppelt(rohIndex)
    }}
    @keydown=${(e: KeyboardEvent) => {
      // In einer Eingabezelle gehoeren die Pfeile dem Text, auf einem Knopf
      // gehoert Enter dem Knopf.
      if ((e.target as HTMLElement).closest('.zell-eingabe, button')) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const hoch = e.key === 'ArrowUp'
        const bewegt = bewegeZeilenFokus(e.target, hoch ? -1 : 1)
        if (bewegt || (hoch && fokussiereSuchzeile(e.target))) e.preventDefault()
        return
      }
      if (schmuck.taste(e)) {
        e.preventDefault()
        return
      }
      if (e.key !== 'Enter') return
      e.preventDefault()
      tun.aktiviereZeile(rohIndex, ansichtIndex)
    }}
  >
    ${lage.spalten.map((s, i) => {
      const platz = lage.plaetze[i]
      const wert = rohIndex !== null ? lage.wertVon(rohIndex, platz) : ZELLE_PLATZHALTER
      const eigene = rohIndex === null ? null : schmuck.zelle(platz, s, wert)
      if (eigene !== null) return eigene
      // Ohne Kopfzeile uebernimmt die Zelle im Editor den Kopf-Griff.
      const kopfGriff = lage.imEditor && !lage.zeigeKopf && lage.editable
      const klassen = [
        s.versteckt === true ? 'versteckt' : '',
        rohIndex !== null && alsZahl(wert) !== null ? 'zahl' : '',
      ].filter((k) => k !== '').join(' ')
      const fehltext = i === 0 && schmuck.fehltext !== ''
        ? html`<span class="fehltext">${schmuck.fehltext}</span>`
        : nothing
      return html`<div
        class=${klassen === '' ? nothing : klassen}
        role="cell"
        data-ff-editable=${kopfGriff ? '' : nothing}
        data-ff-eintrag=${kopfGriff && ansichtIndex === 0 ? platz : nothing}
      >${markiereTreffer(wert, lage.suchtext)}${fehltext}</div>`
    })}
    ${schmuck.rechts}
  </div>`
}

export function tabelleKoerper(lage: KoerperLage, tun: KoerperHandeln): TemplateResult {
  // Das Untere steht an der ersten freien Zeile: hinter den Daten, vor allem,
  // was nur fuellt.
  const ersteLeere = lage.zeilen.indexOf(null)
  return html`
      ${lage.zeigeSuche ? html`<div class="suchzeile">
        <input
          type="search"
          placeholder="Tabelle durchsuchen…"
          aria-label="Tabelle durchsuchen"
          .value=${lage.suchtext}
          @input=${(e: Event) => tun.setzeSuchtext((e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key !== 'ArrowDown') return
            if (fokussiereErsteZeile(e.target)) e.preventDefault()
          }}
        />
      </div>` : ''}
      <div class="koerper" role=${lage.leer ? nothing : 'table'} tabindex="-1">
      ${lage.zeigeKopf ? html`<div class="kopf" role="row" style=${styleMap(lage.cols)}>
        ${
          // Kopfzelle und Greifstreifen nennen ihren Gitterplatz beide
          // ausdruecklich, sonst rutschen die Zellen in eine zweite Reihe.
          lage.spalten.map(
          (s, i) => html`<div
            class=${[s.versteckt === true ? 'versteckt' : '', s.summe === true ? 'z' : '']
              .filter((k) => k !== '').join(' ') || nothing}
            role="columnheader"
            data-ff-editable
            data-ff-eintrag=${lage.imEditor ? lage.plaetze[i] : nothing}
            style="grid-row: 1; grid-column: ${i + 1}"
            @click=${() => tun.klickKopf(lage.plaetze[i])}
            @contextmenu=${lage.spaltenwahlAn
              ? (e: MouseEvent) => tun.oeffneSpaltenwahl(e)
              : nothing}
          ><span class="kopf-text">${s.titel}</span>${!lage.editable && lage.sortSpalte === lage.plaetze[i]
            ? html`<span class="sort-pfeil">${lage.sortAuf ? ' ▲' : ' ▼'}</span>`
            : ''}</div>`,
        )}
        ${breitenGriffe(lage.spalten.length, tun.breiten)}
      </div>` : nothing}
        ${lage.leer ? leerZustand(lage.leerText, true) : html`
        ${lage.zeilen.map((rohIndex, ansichtIndex) => html`${
          ansichtIndex === ersteLeere ? lage.unten : nothing
        }${zeileTpl(lage, tun, rohIndex, ansichtIndex)}`)}
        ${ersteLeere === -1 ? lage.unten : nothing}
        ${lineal(lage)}`}
      </div>
      ${spaltenWahlTpl(lage.spaltenwahl, tun.spaltenwahl)}
    `
}

export interface FussLage {
  hatQuelle: boolean

  sichtbar: number
  gesamt: number
  suchtAktiv: boolean
  auswahlAktiv: boolean
  seite: number
  seiten: number

  summen: readonly { titel: string; text: string }[]

  blaettert: boolean

  leer: boolean
}

export interface FussHandeln {
  blaettere: (zu: number) => void
}

export function tabelleFuss(
  lage: FussLage,
  tun: FussHandeln,
): TemplateResult | typeof nothing {
  // Der Fuss steht auch ohne Quelle: im Editor zeigt er die Form der Maske,
  // die Zahlen sind Striche. Nur der Leerzustand nimmt ihm den Platz.
  if (lage.leer) return nothing
  return html`<div class="fusszeile">
    <div class="seiten-info">${datensatzText({
      hatQuelle: lage.hatQuelle,
      sichtbar: lage.sichtbar,
      gesamt: lage.gesamt,
      suchtAktiv: lage.suchtAktiv,
      auswahlAktiv: lage.auswahlAktiv,
    })}</div>
    ${lage.summen.length === 0 ? nothing : html`<div class="summen">
      ${lage.summen.map((s) => html`<span class="summe">
        <span class="summe-titel">${s.titel}</span>
        <b>${s.text}</b>
      </span>`)}
    </div>`}
    <div class="fuss-rechts">
      ${!lage.blaettert ? nothing : html`<div class="seiten-nav">
        <button
          aria-label="Seite zurück"
          ?disabled=${lage.seite <= 0}
          @click=${() => tun.blaettere(lage.seite - 1)}
        >‹</button>
        <span>Seite ${lage.seite + 1} von ${lage.seiten}</span>
        <button
          aria-label="Seite vor"
          ?disabled=${lage.seite >= lage.seiten - 1}
          @click=${() => tun.blaettere(lage.seite + 1)}
        >›</button>
      </div>`}
    </div>
  </div>`
}
