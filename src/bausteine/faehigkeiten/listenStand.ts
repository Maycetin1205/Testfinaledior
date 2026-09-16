// Faehigkeit Liste: die gezeichnete Zeilenliste eines Bausteins — Spalten,
// Breiten, Sortierung, Seiten, Auswahl, Datenanschluss, Kopf, Rumpf und Fuss.
import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { kettenLesen } from '../../kern/daten/aktionen'
import type { Berechnung } from '../../kern/daten/berechnung'
import { jaNeinEigenschaft, type Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { ListenBindung } from '../../kern/maske/listenBindung'
import { AnsichtsStand } from './ansichtsStand'
import { geberIdVon, setzeAuswahl } from './auswahl'
import { meldeKettenFehler, runEvent } from './ereignisse'
import { LEER_TEXT_STANDARD, leerTextEigenschaft } from './leerZustand'
import { tagFeldEigenschaft } from './quelle'
import { ZEILEN_HOEHE, type MessZiel } from './seitengroesse'
import { spaltenSicht, standardSpalten, type Spalte } from './spalten'
import { BreitenStand } from './spaltenBreite'
import { SpaltenWahlStand } from './spaltenWahl'
import { tabelleAnsicht, zeigtEchteDaten } from './tabelleAnsicht'
import {
  OHNE_SCHMUCK,
  tabelleFuss,
  tabelleKoerper,
  type Unterzeilen,
  type Zeilenschmuck,
} from './tabelleKoerper'
import {
  aktiviereZeile,
  fokussierterRohIndex,
  TASTE_F4,
  ZEILE_DOPPELT,
  ZEILE_GEWAEHLT,
  ZeilenWahl,
  zeileDoppelt,
} from './zeilenAktivierung'
import {
  connectTable,
  disconnectTable,
  leiteZeilenAb,
  zeilenIndexVon,
  zeilenMerkmalVon,
  type BereitgestellteZeile,
  type Datenbesitz,
  type RuntimeTableElement,
} from './zeilenAnschluss'

export const LISTEN_RASTER = { startBreite: 48, startHoehe: 14, minBreite: 12, minHoehe: 4 }

// Die Eigenschaften, die jede Liste traegt; die Reihenfolge ist die im Export.
export function listenVorgaben(): Record<string, unknown> {
  return {
    quelle: '',
    spalten: standardSpalten(),
    suche: 'ja',
    blaettern: 'ja',
    kopfzeile: 'ja',
    spaltenwahl: 'nein',
    tagFeld: '',
    leerText: LEER_TEXT_STANDARD,
  }
}

export function listenEigenschaften(): Eigenschaft[] {
  return [
    jaNeinEigenschaft(
      'suche',
      'Suchzeile',
      'Zeigt über der Tabelle ein Feld, mit dem der Bediener den Inhalt durchsucht.',
      { brauchtQuelle: true },
    ),
    jaNeinEigenschaft(
      'blaettern',
      'Blättern',
      'Ja: Seiten mit Blätter-Knöpfen. Nein: alles untereinander, der Rumpf rollt.',
    ),
    jaNeinEigenschaft(
      'kopfzeile',
      'Kopfzeile',
      'Aus: keine Titelzeile, kein Sortieren per Titelklick.',
    ),
    jaNeinEigenschaft(
      'spaltenwahl',
      'Spaltenwahl',
      'In der Maske: Rechtsklick auf eine Spaltenüberschrift nimmt Spalten weg '
        + 'und holt sie zurück. Braucht die Kopfzeile.',
    ),
    tagFeldEigenschaft(),
    leerTextEigenschaft(),
  ]
}

export function listenFaehigkeiten(bindung: ListenBindung): Faehigkeit[] {
  return [
    { art: 'quelle' },
    { art: 'satzwahl' },
    { art: 'auswahlFolgen' },
    { art: 'liste', bindung },
    {
      art: 'ereignisse',
      liste: [
        { schluessel: ZEILE_GEWAEHLT, name: 'Zeile gewählt' },
        { schluessel: ZEILE_DOPPELT, name: 'Zeile doppelt geklickt' },
        { schluessel: TASTE_F4, name: 'F4 – Aktion an der Zeile' },
      ],
    },
  ]
}

export interface ListenBaustein extends RuntimeTableElement, MessZiel {
  imEditor: boolean
  editable: boolean
}

export interface ListenWirt {
  baustein: ListenBaustein

  melde: () => void

  spalten: () => Spalte[]

  berechnungen: () => readonly Berechnung[]

  schreibeSpalten: (spalten: Spalte[]) => void

  quelle: () => string
  suche: () => boolean
  blaettern: () => boolean
  kopfzeile: () => boolean
  spaltenwahl: () => boolean
  leerText: () => string

  // Die drei Naehte, an denen ein schreibender Baustein in die Liste greift.
  // Ohne sie zeichnet sie, was geliefert wurde, und haengt nichts an.
  zellWert?: (rohIndex: number, platz: number) => string
  schmuck?: () => (rohIndex: number | null) => Zeilenschmuck
  unten?: () => Unterzeilen | null
}

export class ListenStand {
  private readonly wirt: ListenWirt

  private _besitz: Datenbesitz = 'softengine'

  private readonly _breiten: BreitenStand

  private readonly _ansicht: AnsichtsStand

  private readonly _wahl: SpaltenWahlStand

  private readonly _zeilenWahl: ZeilenWahl

  constructor(wirt: ListenWirt) {
    this.wirt = wirt
    this._breiten = new BreitenStand({
      imEditor: () => wirt.baustein.imEditor,
      vollerPlatz: (gezeichnet) =>
        spaltenSicht(wirt.spalten(), wirt.baustein.imEditor, this._wahl.weg())
          .plaetze[gezeichnet] ?? gezeichnet,
      spaltenListe: () => wirt.spalten(),
      schreibeSpalten: (spalten) => wirt.schreibeSpalten(spalten),
      melde: () => wirt.melde(),
    })
    this._ansicht = new AnsichtsStand({
      baustein: wirt.baustein,
      editable: () => wirt.baustein.editable,
      zeilenHoehe: () => ZEILEN_HOEHE,
      melde: () => wirt.melde(),
      spalten: () => wirt.spalten(),
      merktSortierung: () => !wirt.baustein.imEditor,
    })
    this._wahl = new SpaltenWahlStand({
      baustein: wirt.baustein,
      an: () => this.spaltenwahlAn,
      melde: () => wirt.melde(),
      breitenVergessen: () => this._breiten.vergessen(),
    })
    this._zeilenWahl = new ZeilenWahl(wirt.baustein)
  }

  get besitz(): Datenbesitz {
    return this._besitz
  }

  set besitz(neu: Datenbesitz) {
    if (neu === this._besitz) return
    this._besitz = neu
    this.zuruecksetzen()
    if (this.wirt.baustein.isConnected) {
      if (neu === 'provided') disconnectTable(this.wirt.baustein)
      else connectTable(this.wirt.baustein)
    }
    this.wirt.melde()
  }

  set bereitgestellteZeilen(zeilen: readonly BereitgestellteZeile[]) {
    const el = this.wirt.baustein
    const abgeleitet = leiteZeilenAb(zeilen, this.wirt.spalten(), this.wirt.berechnungen())
    el.rohzeilen = abgeleitet.rohzeilen
    el.datenzeilen = abgeleitet.datenzeilen
    el.datenGeliefert = true
    this._zeilenWahl.vergiss()
    el.durchAuswahlGefiltert = false
    this._ansicht.nachPush()
    this.wirt.melde()
  }

  zuruecksetzen(): void {
    const el = this.wirt.baustein
    el.rohzeilen = []
    el.datenzeilen = []
    el.datenGeliefert = false
    this._zeilenWahl.vergiss()
    el.durchAuswahlGefiltert = false
    this._ansicht.zuruecksetzen()
  }

  fokussiereSuche(): boolean {
    return this._ansicht.fokussiereSuche()
  }

  setzeSuchtext(text: string): void {
    this._ansicht.setzeSuchtext(text)
    this.wirt.melde()
  }

  // Die fluechtigen Breiten haengen am Platz der Spalte; aendert sich die Liste,
  // gilt wieder die gleichmaessige Aufteilung.
  spaltenGewechselt(): void {
    this._breiten.vergessen()
  }

  private get hatQuelle(): boolean {
    // Im Editor liefert auch niemand Zeilen: dann gelten dieselben Striche wie
    // bei einer Tabelle ohne Quelle, statt einer leeren weissen Flaeche.
    const imEditor = this.wirt.baustein.imEditor
    return this._besitz === 'provided' && !imEditor
      ? true
      : zeigtEchteDaten(imEditor, this.wirt.quelle())
  }

  private get spaltenwahlAn(): boolean {
    return this.wirt.spaltenwahl() && this.wirt.kopfzeile() && !this.wirt.baustein.imEditor
  }

  private zellWert(rohIndex: number, platz: number): string {
    if (this.wirt.zellWert) return this.wirt.zellWert(rohIndex, platz)
    return this.wirt.baustein.datenzeilen[rohIndex]?.[platz] ?? ''
  }

  private readonly aktionsTaste = (e: KeyboardEvent): void => {
    const el = this.wirt.baustein
    if (el.imEditor || e.defaultPrevented || e.key !== 'F4'
      || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (!kettenLesen(el.getAttribute('data-ff-aktionen'))[TASTE_F4]?.length) return
    e.preventDefault()
    e.stopPropagation()
    if (e.repeat) return
    const fokus = fokussierterRohIndex(el.shadowRoot)
    // Die leere Erfassungszeile darf nicht versehentlich die vorherige Auswahl meinen.
    const platz = fokus === undefined ? this._zeilenWahl.platzIn(el.rohzeilen) : fokus
    const zeile = platz === null ? undefined : el.rohzeilen[platz]
    if (zeile === undefined) return
    setzeAuswahl(geberIdVon(el), zeile, true, zeilenMerkmalVon(el, zeile))
    const satz = zeilenIndexVon(el, zeile)
    runEvent(el, TASTE_F4, { PINDEX: satz, DROP_PINDEX: satz }).catch(meldeKettenFehler)
  }

  // F5 ist in der Maske das Nachschlagen. Faellt die Taste bis zum Browser
  // durch, laedt der die ganze Maske neu, und jede Vormerkung ist weg.
  private readonly sperrtNeuladen = (e: KeyboardEvent): void => {
    if (!this.wirt.baustein.imEditor && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  angemeldet(): void {
    const el = this.wirt.baustein
    el.addEventListener('keydown', this.aktionsTaste)
    el.addEventListener('keydown', this.sperrtNeuladen)
    if (this._besitz === 'softengine') connectTable(el)
    this._ansicht.beobachte()
  }

  beobachte(): void {
    this._ansicht.beobachte()
  }

  nachRendern(): void {
    this._ansicht.nachRendern()
  }

  abgemeldet(): void {
    const el = this.wirt.baustein
    el.removeEventListener('keydown', this.aktionsTaste)
    el.removeEventListener('keydown', this.sperrtNeuladen)
    this._wahl.loese()
    this._ansicht.loese()
    disconnectTable(el)
  }

  private oeffneSpaltenwahl(e: MouseEvent): void {
    const rahmen = this.wirt.baustein.shadowRoot?.querySelector('.tabelle')?.getBoundingClientRect()
    if (!rahmen) return
    this._wahl.oeffne(e, rahmen)
  }

  zeichne(): TemplateResult {
    const el = this.wirt.baustein
    const spalten = this.wirt.spalten()
    const sicht = spaltenSicht(spalten, el.imEditor, this._wahl.weg())
    const unten = this.wirt.unten?.() ?? null
    const schmuck = this.wirt.schmuck?.() ?? ((): Zeilenschmuck => OHNE_SCHMUCK)

    const ansicht = tabelleAnsicht({
      spalten,
      gezeichnet: sicht.spalten,
      plaetze: sicht.plaetze,
      breiteVon: (i) => this._breiten.breiteVon(i),
      hatQuelle: this.hatQuelle,
      datenGeliefert: el.datenGeliefert,
      datenzeilen: el.datenzeilen,
      suchtext: this._ansicht.suchtext,
      sortSpalte: this._ansicht.sortSpalte,
      sortAuf: this._ansicht.sortAuf,
      wunschSeite: this._ansicht.seite,
      gemessen: this._ansicht.mass,
      belegteZeilen: unten?.anzahl ?? 0,
      wertVon: (zeile, spalte) => this.zellWert(zeile, spalte),
      blaettert: this.wirt.blaettern(),
    })
    return html`<div class="tabelle" style=${styleMap({
      '--takt': `${ansicht.takt}px`,
      '--zeilen-hoehe': `${ansicht.zeilenHoehe}px`,
    })}>
      ${tabelleKoerper({
        spalten: sicht.spalten,
        plaetze: sicht.plaetze,
        cols: ansicht.cols,
        editable: el.editable,
        imEditor: el.imEditor,
        zeigeKopf: this.wirt.kopfzeile(),
        spaltenwahlAn: this.spaltenwahlAn,
        spaltenwahl: this._wahl.offen === null ? null : {
          waehlbar: spalten.filter((sp) => sp.versteckt !== true),
          weg: this._wahl.weg(),
          links: this._wahl.offen.links,
          oben: this._wahl.offen.oben,
        },
        auswahlSemantik: geberIdVon(el) !== '',
        zeigeSuche: this.wirt.suche(),
        suchtext: this._ansicht.suchtext,
        sortSpalte: this._ansicht.sortSpalte,
        sortAuf: this._ansicht.sortAuf,
        zeilen: ansicht.zeilen,
        wertVon: (zeile, spalte) => this.zellWert(zeile, spalte),
        linealTakte: ansicht.linealTakte,
        hatQuelle: ansicht.hatQuelle,
        auswahlIndex: this._zeilenWahl.platzIn(el.rohzeilen),
        leer: ansicht.leer,
        leerText: this.wirt.leerText(),
        schmuck,
        unten: unten === null
          ? nothing
          : unten.zeichne({ sicht, cols: ansicht.cols, linealTakte: ansicht.linealTakte }),
      }, {
        setzeSuchtext: (text) => this._ansicht.setzeSuchtext(text),
        oeffneSpaltenwahl: (e) => this.oeffneSpaltenwahl(e),
        spaltenwahl: {
          schalte: (kennung) => this._wahl.schalte(kennung),
          alleZeigen: () => this._wahl.alleZeigen(),
          schliesse: () => this._wahl.schliesse(),
        },
        breiten: this._breiten.wirtFuerZug(),
        klickKopf: (i) => {
          if (!el.editable) this._ansicht.klickSortiere(i)
        },
        aktiviereZeile: (rohIndex, ansichtIndex) => {
          aktiviereZeile(el, this._zeilenWahl, el.rohzeilen, rohIndex, ansichtIndex)
          this.wirt.melde()
        },
        zeileDoppelt: (rohIndex) => zeileDoppelt(el, el.rohzeilen, rohIndex),
      })}
      ${tabelleFuss({
        hatQuelle: ansicht.hatQuelle,
        sichtbar: ansicht.gesamt,
        gesamt: el.datenzeilen.length,
        suchtAktiv: this._ansicht.suchtAktiv,
        auswahlAktiv: el.durchAuswahlGefiltert,
        seite: ansicht.seite,
        seiten: ansicht.seiten,
        blaettert: this.wirt.blaettern(),
        summen: ansicht.summen,
        leer: ansicht.leer,
      }, {
        blaettere: (zu) => this._ansicht.blaettere(zu),
      })}
    </div>`
  }
}
