// Baustein Tabelle: zeigt die Zeilen einer Quelle, sucht, sortiert, blaettert, waehlt eine Zeile.
import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Berechnung } from '../../kern/daten/berechnung'
import { jaNeinEigenschaft, type Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { kettenLesen } from '../../kern/daten/aktionen'
import { geberIdVon, setzeAuswahl } from '../faehigkeiten/auswahl'
import { meldeKettenFehler, runEvent } from '../faehigkeiten/ereignisse'
import { LEER_TEXT_STANDARD, leerStil, leerTextEigenschaft } from '../faehigkeiten/leerZustand'
import { tagFeldEigenschaft } from '../faehigkeiten/quelle'
import {
  connectTable,
  disconnectTable,
  leiteZeilenAb,
  zeilenIndexVon,
  zeilenMerkmalVon,
  type BereitgestellteZeile,
  type Datenbesitz,
} from '../faehigkeiten/zeilenAnschluss'
import {
  coerceSpalten,
  SPALTEN_BINDUNG,
  spaltenSicht,
  standardSpalten,
  tryCoerceSpalten,
  type Spalte,
} from '../faehigkeiten/spalten'
import { AnsichtsStand } from '../faehigkeiten/ansichtsStand'
import {
  aktiviereZeile,
  fokussierterRohIndex,
  TASTE_F4,
  ZEILE_DOPPELT,
  ZEILE_GEWAEHLT,
  ZeilenWahl,
  zeileDoppelt,
} from '../faehigkeiten/zeilenAktivierung'
import { BreitenStand } from '../faehigkeiten/spaltenBreite'
import { SpaltenWahlStand } from '../faehigkeiten/spaltenWahl'
import { ZEILEN_HOEHE } from '../faehigkeiten/seitengroesse'
import { tabelleAnsicht, zeigtEchteDaten } from '../faehigkeiten/tabelleAnsicht'
import {
  OHNE_SCHMUCK,
  tabelleFuss,
  tabelleKoerper,
  type Unterzeilen,
  type Zeilenschmuck,
} from '../faehigkeiten/tabelleKoerper'
import { tabelleStil } from './tabelleStil'

export class Tabelle extends Grundbaustein {
  // Als string, nicht als Literal: die Erfassung erbt noch und traegt eigene Namen.
  static readonly typ: string = 'tabelle'
  static readonly tag: string = 'ff-tabelle'
  static readonly anzeigeName: string = 'Tabelle'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'satzwahl' },
    { art: 'auswahlFolgen' },
    { art: 'liste', bindung: SPALTEN_BINDUNG },
    {
      art: 'ereignisse',
      liste: [
        { schluessel: ZEILE_GEWAEHLT, name: 'Zeile gewählt' },
        { schluessel: ZEILE_DOPPELT, name: 'Zeile doppelt geklickt' },
        { schluessel: TASTE_F4, name: 'F4 – Aktion an der Zeile' },
      ],
    },
  ]

  static readonly vorgaben = {
    quelle: '',
    spalten: standardSpalten(),
    suche: 'ja',
    blaettern: 'ja',
    kopfzeile: 'ja',
    spaltenwahl: 'nein',
    tagFeld: '',
    leerText: LEER_TEXT_STANDARD,
  }

  static override readonly eigenschaften: Eigenschaft[] = [
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

  static readonly raster = { startBreite: 48, startHoehe: 14, minBreite: 12, minHoehe: 4 }

  static override styles: CSSResultGroup = [Grundbaustein.styles, leerStil, tabelleStil]

  @property({
    converter: {
      fromAttribute: (v: string | null): Spalte[] =>
        v ? tryCoerceSpalten(v) : standardSpalten(),
      toAttribute: (v: Spalte[]): string => JSON.stringify(v),
    },
  })
  spalten: Spalte[] = standardSpalten()

  @property() quelle = ''

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
      : zeigtEchteDaten(this.imEditor, this.quelle)
  }

  // Die vier Naehte der Erfassung, die noch erbt: Spaltenform, Rechnung, Zellwert,
  // Zeilenschmuck. Sie fallen, sobald die Erfassung ein eigener Baustein ist.
  protected spaltenListe(): Spalte[] {
    return coerceSpalten(this.spalten)
  }

  protected berechnungsListe(): readonly Berechnung[] {
    return []
  }

  protected zellWert(rohIndex: number, platz: number): string {
    return this.datenzeilen[rohIndex]?.[platz] ?? ''
  }

  protected zeilenSchmuck(): (rohIndex: number | null) => Zeilenschmuck {
    return () => OHNE_SCHMUCK
  }

  protected unterZeilen(): Unterzeilen | null {
    return null
  }

  private get zeilenHoehe(): number {
    return ZEILEN_HOEHE
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
    if (!kettenLesen(this.getAttribute('data-ff-aktionen'))[TASTE_F4]?.length) return
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
    runEvent(this, TASTE_F4, { PINDEX: satz, DROP_PINDEX: satz }).catch(meldeKettenFehler)
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

Grundbaustein.defineAndRegister(Tabelle)
