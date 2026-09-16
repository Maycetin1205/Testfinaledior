// Baustein Tabelle: zeigt die Zeilen einer Quelle, sucht, sortiert, blaettert, waehlt eine Zeile.
import { type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { LEER_TEXT_STANDARD, leerStil } from '../faehigkeiten/leerZustand'
import {
  LISTEN_RASTER,
  ListenStand,
  listenEigenschaften,
  listenFaehigkeiten,
  listenVorgaben,
} from '../faehigkeiten/listenStand'
import {
  SPALTEN_BINDUNG,
  coerceSpalten,
  standardSpalten,
  tryCoerceSpalten,
  type Spalte,
} from '../faehigkeiten/spalten'
import { tabelleStil } from '../faehigkeiten/tabelleStil'
import type { BereitgestellteZeile, Datenbesitz } from '../faehigkeiten/zeilenAnschluss'

export class Tabelle extends Grundbaustein {
  static readonly typ = 'tabelle'
  static readonly tag = 'ff-tabelle'
  static readonly anzeigeName = 'Tabelle'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = listenFaehigkeiten(SPALTEN_BINDUNG)

  static readonly vorgaben = listenVorgaben()

  static override readonly eigenschaften: Eigenschaft[] = listenEigenschaften()

  static readonly raster = LISTEN_RASTER

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

  private readonly _liste = new ListenStand({
    baustein: this,
    melde: () => this.requestUpdate(),
    spalten: () => coerceSpalten(this.spalten),
    berechnungen: () => [],
    // Ein Undo-Schritt je Aenderung der Spaltenliste.
    schreibeSpalten: (spalten) => {
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail: { attr: 'spalten', value: spalten },
        bubbles: true,
        composed: true,
      }))
    },
    quelle: () => this.quelle,
    suche: () => this.suche === 'ja',
    blaettern: () => this.blaettern === 'ja',
    kopfzeile: () => this.kopfzeile === 'ja',
    spaltenwahl: () => this.spaltenwahl === 'ja',
    leerText: () => this.leerText,
  })

  get besitz(): Datenbesitz {
    return this._liste.besitz
  }

  set besitz(neu: Datenbesitz) {
    this._liste.besitz = neu
  }

  set bereitgestellteZeilen(zeilen: readonly BereitgestellteZeile[]) {
    this._liste.bereitgestellteZeilen = zeilen
  }

  fokussiereSuche(): boolean {
    return this._liste.fokussiereSuche()
  }

  setzeSuchtext(text: string): void {
    this._liste.setzeSuchtext(text)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this._liste.angemeldet()
  }

  protected override firstUpdated(): void {
    this._liste.beobachte()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('spalten')) this._liste.spaltenGewechselt()
  }

  protected override updated(): void {
    this._liste.nachRendern()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._liste.abgemeldet()
  }

  override render(): TemplateResult {
    return this._liste.zeichne()
  }
}

Grundbaustein.defineAndRegister(Tabelle)
