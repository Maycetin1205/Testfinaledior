// Zeichnet, was das Erfassen an die Liste haengt: Zeilenschmuck, Tippzelle,
// Kreuz, erfasste Zeilen.
import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { eingabeStelleTpl, zellenKlasse } from './zellenEingabe'
import { spalteAenderbar } from './erfassungsSpalte'
import { alsZahl } from './sortierung'
import type { Spalte } from './spalten'
import { OHNE_SCHMUCK, type Zeilenschmuck } from './tabelleKoerper'
import type { ZeilenBearbeitung } from './zeilenBearbeitung'
import type { ZeilenZeichen } from './zeilenStatus'

export function tippZelleTpl(
  stand: ZeilenBearbeitung,
  rohIndex: number,
  platz: number,
  spalte: Spalte,
): TemplateResult {
  // Dieselbe Zahlenkante wie an einer Zelle ohne Eingabefeld: sonst stuenden in
  // derselben Spalte die gebuchten Zeilen links und die erfassten rechts.
  const wert = stand.zellWert(rohIndex, platz)
  return html`<div
    class=${alsZahl(wert) !== null ? 'tippbar zahl' : 'tippbar'}
    role="cell"
  >${eingabeStelleTpl({
    wert,
    titel: spalte.titel,
    platzhalter: '',
    klasse: zellenKlasse(stand.istGeaendert(rohIndex, platz) ? 'geaendert' : 'ruhig'),
    halterKlasse: 'zell-halter',
    platz,
    vorschlaege: [],
    marke: 0,
  }, {
    tippen: (text) => stand.tippeZelle(rohIndex, platz, text),
    taste: (e) => stand.tasteZelle(rohIndex, platz, e),
    verlassen: (text) => stand.verlasseZelle(rohIndex, platz, text),
    waehleVorschlag: () => {},
    setzeMarke: () => {},
  })}</div>`
}

export function loeschKreuzTpl(geloescht: boolean, schalte: () => void): TemplateResult {
  return html`<button
    class="zeile-weg"
    type="button"
    title=${geloescht ? 'Löschen zurücknehmen' : 'Diese Position zum Löschen vormerken'}
    aria-label=${geloescht ? 'Löschen zurücknehmen' : 'Position zum Löschen vormerken'}
    @click=${(e: MouseEvent) => { e.stopPropagation(); schalte() }}
  >${geloescht ? '\u21BA' : '\u2715'}</button>`
}

// Im Editor nur die Ansage, dass es in der Maske ein Kreuz gibt.
export function kreuzAnzeigeTpl(): TemplateResult {
  return html`<span
    class="zeile-weg zeile-weg-anzeige"
    title="Zeilen l\u00F6schbar \u2014 in der Maske per Kreuz oder Entf-Taste"
  >&#x2715;</span>`
}

export interface ErfassteLage {
  spalten: readonly Spalte[]
  plaetze: readonly number[]

  cols: Readonly<Record<string, string>>

  imEditor: boolean

  erfasste: readonly (readonly string[])[]

  erfasstStand: (index: number) => ZeilenZeichen

  // null: die Tipp-Zeile sitzt unten und legt neue Zeilen an; sonst der Platz,
  // an dem sie eine erfasste Zeile an Ort und Stelle korrigiert.
  korrekturPlatz: number | null

  erfassung: TemplateResult
}

export interface ErfassteHandeln {
  nimmErfassteZeile: (index: number) => void

  holeErfassteZeile: (index: number) => void
}

// Die erfassten Zeilen und die Tipp-Zeile an ihrem Platz dazwischen oder danach.
export function erfassteZeilenTpl(lage: ErfassteLage, tun: ErfassteHandeln): TemplateResult {
  return html`${lage.erfasste.map((werte, zeilenIndex) => {
    const zeichen = lage.erfasstStand(zeilenIndex)
    // Hinausgeschickt heisst: nicht mehr anfassen, im ERP steht sie schon.
    const fest = zeichen.status === 'geschrieben'
    return html`${zeilenIndex === lage.korrekturPlatz ? lage.erfassung : nothing}<div
      class="zeile erfasst"
      role="row"
      data-status=${zeichen.status}
      title=${lage.imEditor || fest ? zeichen.titel : `${zeichen.titel} — zum Korrigieren anklicken`}
      style=${styleMap(lage.cols)}
      @click=${lage.imEditor || fest ? nothing : () => tun.holeErfassteZeile(zeilenIndex)}
    >
      ${lage.spalten.map((_s, i) => {
        const wert = werte[lage.plaetze[i]] ?? ''
        const fehltext = i === 0 && zeichen.status === 'fehler'
          ? html`<span class="fehltext">${zeichen.titel}</span>`
          : nothing
        return html`<div class=${alsZahl(wert) !== null ? 'zahl' : nothing} role="cell">${wert}${fehltext}</div>`
      })}
      ${lage.imEditor ? nothing : html`<button
          class="zeile-weg"
          type="button"
          title=${fest
            ? 'Aus der Ansicht nehmen — geschrieben ist sie schon'
            : 'Diese erfasste Zeile wieder wegnehmen'}
          aria-label="Erfasste Zeile wegnehmen"
          @click=${(e: MouseEvent) => {
            e.stopPropagation()
            tun.nimmErfassteZeile(zeilenIndex)
          }}
        >&#x2715;</button>`}
    </div>`
  })}${lage.korrekturPlatz === null || lage.korrekturPlatz >= lage.erfasste.length
    ? lage.erfassung
    : nothing}`
}

export interface SchmuckLage {
  imEditor: boolean

  loeschbar: boolean

  // Getippt wird nur in der Maske und nur an Zeilen mit Satznummer.
  tippbar: boolean

  zeilen: ZeilenBearbeitung
}

// Was eine gebuchte Zeile ueber die gelieferten Werte hinaus traegt: Statuspunkt,
// Tippzelle und das Kreuz, das sie zum Loeschen vormerkt.
export function erfassungsSchmuck(lage: SchmuckLage): (rohIndex: number | null) => Zeilenschmuck {
  const kreuz = lage.loeschbar && lage.tippbar
  return (rohIndex) => {
    if (rohIndex === null) {
      return {
        ...OHNE_SCHMUCK,
        rechts: lage.loeschbar && lage.imEditor ? kreuzAnzeigeTpl() : nothing,
      }
    }
    const zeichen = lage.zeilen.statusVon(rohIndex)
    const geloescht = lage.zeilen.istGeloescht(rohIndex)
    return {
      status: zeichen.status === 'gebucht' ? '' : zeichen.status,
      titel: zeichen.titel,
      klasse: geloescht ? 'geloescht' : '',
      fehltext: zeichen.status === 'fehler' ? zeichen.titel : '',
      zelle: (platz, spalte) => (lage.tippbar && spalteAenderbar(spalte)
        ? tippZelleTpl(lage.zeilen, rohIndex, platz, spalte)
        : null),
      rechts: kreuz
        ? loeschKreuzTpl(geloescht, () => lage.zeilen.schalteLoeschung(rohIndex))
        : nothing,
      taste: (e) => {
        if (e.key !== 'Delete' || !kreuz) return false
        lage.zeilen.schalteLoeschung(rohIndex)
        return true
      },
    }
  }
}
