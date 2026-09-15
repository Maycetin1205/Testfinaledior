// Baustein Tabelle: zeigt die Zeilen einer Quelle, sucht, sortiert, blaettert, waehlt eine Zeile.
import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { BasicBlock } from '../base/BasicBlock'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import type { Berechnung } from '../../core/data/berechnung'
import type { Faehigkeit } from '../../core/blocks/faehigkeiten'
import { geberIdVon, setzeAuswahl } from '../shared/auswahl'
import { LEER_TEXT_STANDARD, leerStil } from '../shared/leerZustand'
import { OHNE_SCHMUCK, type Unterzeilen, type Zeilenschmuck } from '../shared/zeilenNaehte'
import {
  connectTable,
  disconnectTable,
  leiteZeilenAb,
  zeilenIndexVon,
  zeilenMerkmalVon,
  type BereitgestellteZeile,
  type Datenbesitz,
} from './seRuntime'
import {
  coerceSpalten,
  spaltenSicht,
  standardSpalten,
  tryCoerceSpalten,
  type Spalte,
} from './spalten'
import { AnsichtsStand } from './ansichtsStand'
import { aktiviereZeile, ZeilenWahl, zeileDoppelt } from './zeilenAktivierung'
import { BreitenStand } from './spaltenBreite'
import { SpaltenWahlStand } from './spaltenWahl'
import { ZEILEN_HOEHE } from './seitengroesse'
import { tabelleAnsicht, zeigtEchteDaten } from './tabelleAnsicht'
import { SPALTEN_BINDUNG, TABELLE_EIGENSCHAFTEN } from './tabelleEigenschaften'
import { tabelleFuss, tabelleKoerper } from './tabelleKoerper'
import { tabelleStil } from './tabelleStil'
import { kettenLesen } from '../../core/data/aktionen'
import { meldeKettenFehler, runEvent } from '../shared/seAktionen'
import { fokussierterRohIndex } from './zeilenAktivierung'

export class TabelleBlock extends BasicBlock {
  // Als string, nicht als Literal: die Erfassung erbt und traegt eigene Namen.
  static readonly blockType: string = 'tabelle'
  static readonly tagName: string = 'ff-tabelle'
  static readonly displayName: string = 'Tabelle'
  static readonly category: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'satzwahl' },
    { art: 'auswahlFolgen' },
    { art: 'liste', bindung: SPALTEN_BINDUNG },
    {
      art: 'ereignisse',
      liste: [
        { key: 'onRowClick', name: 'Zeile gewählt' },
        { key: 'onRowDblClick', name: 'Zeile doppelt geklickt' },
        { key: 'onF4', name: 'F4 – Aktion an der Zeile' },
      ],
    },
  ]
  static readonly defaultProps = {
    width: 'fill',
    source: '',
    spalten: standardSpalten(),
    suche: 'ja',
    blaettern: 'ja',
    kopfzeile: 'ja',
    spaltenwahl: 'nein',
    tagField: '',
    leerText: LEER_TEXT_STANDARD,
  }
  static override readonly customProperties = TABELLE_EIGENSCHAFTEN

  static readonly raster = { startW: 48, startH: 14, minW: 12, minH: 4 }

  static override styles: CSSResultGroup = [BasicBlock.styles, leerStil, tabelleStil]

  @property({
    converter: {
      fromAttribute: (v: string | null): Spalte[] =>
        v ? tryCoerceSpalten(v) : standardSpalten(),
      toAttribute: (v: Spalte[]): string => JSON.stringify(v),
    },
  })
  spalten: Spalte[] = standardSpalten()

  @property() source = ''

  @property() suche = 'ja'

  @property() blaettern = 'ja'

  @property() kopfzeile = 'ja'

  @property() spaltenwahl = 'nein'

  @property() leerText = LEER_TEXT_STANDARD

  @property({ attribute: false }) datenzeilen: string[][] = []

  @property({ attribute: false }) rohzeilen: unknown[] = []

  @property({ attribute: false }) durchAuswahlGefiltert = false

  @property({ attribute: false }) datenGeliefert = false

  private _besitz: Datenbesitz = 'softengine'

  private readonly _breiten = new BreitenStand({
    imEditor: () => this.imEditor,
    vollerPlatz: (gezeichnet) =>
      spaltenSicht(this.spaltenListe(), this.imEditor, this._wahl.weg())
        .plaetze[gezeichnet] ?? gezeichnet,
    spaltenListe: () => this.spaltenListe(),
    schreibeSpalten: (spalten) => this.aendere(spalten),
    melde: () => this.requestUpdate(),
  })

  private readonly _ansicht = new AnsichtsStand({
    baustein: this,
    editable: () => this.editable,
    zeilenHoehe: () => this.zeilenHoehe,
    melde: () => this.requestUpdate(),
    spalten: () => this.spaltenListe(),
    merktSortierung: () => !this.imEditor,
  })

  private readonly _wahl = new SpaltenWahlStand({
    baustein: this,
    an: () => this.spaltenwahlAn,
    melde: () => this.requestUpdate(),
    breitenVergessen: () => this._breiten.vergessen(),
  })

  private readonly _zeilenWahl = new ZeilenWahl(this)

  get besitz(): Datenbesitz {
    return this._besitz
  }

  set besitz(neu: Datenbesitz) {
    if (neu === this._besitz) return
    this._besitz = neu
    this.setzeAbgeleitetesZurueck()
    if (this.isConnected) {
      if (neu === 'provided') disconnectTable(this)
      else connectTable(this)
    }
    this.requestUpdate()
  }

  set bereitgestellteZeilen(zeilen: readonly BereitgestellteZeile[]) {
    const abgeleitet = leiteZeilenAb(zeilen, this.spaltenListe(), this.berechnungsListe())
    this.rohzeilen = abgeleitet.rohzeilen
    this.datenzeilen = abgeleitet.datenzeilen
    this.datenGeliefert = true
    this._zeilenWahl.vergiss()
    this.durchAuswahlGefiltert = false
    this._ansicht.nachPush()
    this.requestUpdate()
  }

  protected setzeAbgeleitetesZurueck(): void {
    this.rohzeilen = []
    this.datenzeilen = []
    this.datenGeliefert = false
    this._zeilenWahl.vergiss()
    this.durchAuswahlGefiltert = false
    this._ansicht.zuruecksetzen()
  }

  fokussiereSuche(): boolean {
    return this._ansicht.fokussiereSuche()
  }

  setzeSuchtext(text: string): void {
    this._ansicht.setzeSuchtext(text)
    this.requestUpdate()
  }

  protected get hatQuelle(): boolean {
    // Im Editor liefert auch niemand Zeilen: dann gelten dieselben Striche wie
    // bei einer Tabelle ohne Quelle, statt einer leeren weissen Flaeche.
    return this._besitz === 'provided' && !this.imEditor
      ? true
      : zeigtEchteDaten(this.imEditor, this.source)
  }

  protected spaltenListe(): Spalte[] {
    return coerceSpalten(this.spalten)
  }

  // Die Liste rechnet nicht; eine erbende Tabelle bringt ihre Berechnungen mit.
  protected berechnungsListe(): readonly Berechnung[] {
    return []
  }

  private get zeilenHoehe(): number {
    return ZEILEN_HOEHE
  }

  // Der Wert einer Zelle, wie Suche, Sortierung und Summe ihn sehen.
  protected zellWert(rohIndex: number, platz: number): string {
    return this.datenzeilen[rohIndex]?.[platz] ?? ''
  }

  // Die zwei Naehte einer erbenden Tabelle, die schreibt. Die Liste selbst
  // haengt an ihre Zeilen nichts und stellt nichts darunter.
  protected zeilenSchmuck(): (rohIndex: number | null) => Zeilenschmuck {
    return () => OHNE_SCHMUCK
  }

  protected unterZeilen(): Unterzeilen | null {
    return null
  }

  // Ein Undo-Schritt je Aenderung der Spaltenliste.
  protected aendere(spalten: Spalte[]): void {
    this.meldeProp('spalten', spalten)
  }

  protected meldeProp(attr: string, value: unknown, geste?: 'beginn' | 'ende'): void {
    this.dispatchEvent(
      new CustomEvent('ff-prop-change', {
        detail: { attr, value, ...(geste === undefined ? {} : { geste }) },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private readonly aktionsTaste = (e: KeyboardEvent): void => {
    if (this.imEditor || e.defaultPrevented || e.key !== 'F4'
      || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (!kettenLesen(this.getAttribute('data-ff-aktionen')).onF4?.length) return
    e.preventDefault()
    e.stopPropagation()
    if (e.repeat) return
    const fokus = fokussierterRohIndex(this.shadowRoot)
    // Die leere Erfassungszeile darf nicht versehentlich die vorherige Auswahl meinen.
    const platz = fokus === undefined ? this._zeilenWahl.platzIn(this.rohzeilen) : fokus
    const zeile = platz === null ? undefined : this.rohzeilen[platz]
    if (zeile === undefined) return
    setzeAuswahl(geberIdVon(this), zeile, true, zeilenMerkmalVon(this, zeile))
    const satz = zeilenIndexVon(this, zeile)
    runEvent(this, 'onF4', { PINDEX: satz, DROP_PINDEX: satz }).catch(meldeKettenFehler)
  }

  // F5 ist in der Maske das Nachschlagen. Faellt die Taste bis zum Browser
  // durch, laedt der die ganze Maske neu, und jede Vormerkung ist weg.
  private readonly sperrtNeuladen = (e: KeyboardEvent): void => {
    if (!this.imEditor && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.aktionsTaste)
    this.addEventListener('keydown', this.sperrtNeuladen)
    if (this._besitz === 'softengine') connectTable(this)
    this._ansicht.beobachte()
  }

  protected override firstUpdated(): void {
    this._ansicht.beobachte()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Die fluechtigen Breiten haengen am Platz der Spalte; aendert sich die
    // Liste, gilt wieder die gleichmaessige Aufteilung.
    if (changed.has('spalten')) this._breiten.vergessen()
  }

  protected override updated(): void {
    this._ansicht.nachRendern()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.aktionsTaste)
    this.removeEventListener('keydown', this.sperrtNeuladen)
    this._wahl.loese()
    this._ansicht.loese()
    disconnectTable(this)
  }

  private get spaltenwahlAn(): boolean {
    return this.spaltenwahl === 'ja'
      && this.kopfzeile === 'ja'
      && !this.imEditor
  }

  private oeffneSpaltenwahl(e: MouseEvent): void {
    const rahmen = this.shadowRoot?.querySelector('.tabelle')?.getBoundingClientRect()
    if (!rahmen) return
    this._wahl.oeffne(e, rahmen)
  }

  override render(): TemplateResult {
    const spalten = this.spaltenListe()

    const sicht = spaltenSicht(spalten, this.imEditor, this._wahl.weg())

    const unten = this.unterZeilen()

    const ansicht = tabelleAnsicht({
      spalten,
      gezeichnet: sicht.spalten,
      plaetze: sicht.plaetze,
      breiteVon: (i) => this._breiten.breiteVon(i),
      hatQuelle: this.hatQuelle,
      datenGeliefert: this.datenGeliefert,
      datenzeilen: this.datenzeilen,
      suchtext: this._ansicht.suchtext,
      sortSpalte: this._ansicht.sortSpalte,
      sortAuf: this._ansicht.sortAuf,
      wunschSeite: this._ansicht.seite,
      gemessen: this._ansicht.mass,
      belegteZeilen: unten?.anzahl ?? 0,
      wertVon: (zeile, spalte) => this.zellWert(zeile, spalte),
      blaettert: this.blaettern === 'ja',
    })
    return html`<div class="tabelle" style=${styleMap({
      '--takt': `${ansicht.takt}px`,
      '--zeilen-hoehe': `${ansicht.zeilenHoehe}px`,
    })}>
      ${tabelleKoerper({
        spalten: sicht.spalten,
        plaetze: sicht.plaetze,
        cols: ansicht.cols,
        editable: this.editable,
        imEditor: this.imEditor,
        zeigeKopf: this.kopfzeile === 'ja',
        spaltenwahlAn: this.spaltenwahlAn,
        spaltenwahl: this._wahl.offen === null ? null : {
          waehlbar: spalten.filter((sp) => sp.versteckt !== true),
          weg: this._wahl.weg(),
          links: this._wahl.offen.links,
          oben: this._wahl.offen.oben,
        },
        auswahlSemantik: geberIdVon(this) !== '',
        zeigeSuche: this.suche === 'ja',
        suchtext: this._ansicht.suchtext,
        sortSpalte: this._ansicht.sortSpalte,
        sortAuf: this._ansicht.sortAuf,
        zeilen: ansicht.zeilen,
        wertVon: (zeile, spalte) => this.zellWert(zeile, spalte),
        linealTakte: ansicht.linealTakte,
        hatQuelle: ansicht.hatQuelle,
        auswahlIndex: this._zeilenWahl.platzIn(this.rohzeilen),
        leer: ansicht.leer,
        leerText: this.leerText,
        schmuck: this.zeilenSchmuck(),
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
          if (!this.editable) this._ansicht.klickSortiere(i)
        },
        aktiviereZeile: (rohIndex, ansichtIndex) => {
          aktiviereZeile(this, this._zeilenWahl, this.rohzeilen, rohIndex, ansichtIndex)
          this.requestUpdate()
        },
        zeileDoppelt: (rohIndex) => zeileDoppelt(this, this.rohzeilen, rohIndex),
      })}
      ${tabelleFuss({
        hatQuelle: ansicht.hatQuelle,
        sichtbar: ansicht.gesamt,
        gesamt: this.datenzeilen.length,
        suchtAktiv: this._ansicht.suchtAktiv,
        auswahlAktiv: this.durchAuswahlGefiltert,
        seite: ansicht.seite,
        seiten: ansicht.seiten,
        blaettert: this.blaettern === 'ja',
        summen: ansicht.summen,
        leer: ansicht.leer,
      }, {
        blaettere: (zu) => this._ansicht.blaettere(zu),
      })}
    </div>`
  }
}

BasicBlock.defineAndRegister(TabelleBlock)
