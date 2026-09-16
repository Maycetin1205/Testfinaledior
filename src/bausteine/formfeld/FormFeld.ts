// Baustein Formularfeld: eine Stelle fuer einen Wert, in sieben Typen plus Nachschlagen.
import { html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Bedingung, Eigenschaft } from '../../kern/maske/eigenschaft'
import { aktionswert, bindbar, type Faehigkeit } from '../../kern/maske/faehigkeiten'
import { coerceNachschlagSpalten } from '../faehigkeiten/nachschlagen'
import {
  NACHSCHLAG_VORGABEN,
  NachschlagFeld,
  nachschlagEigenschaften,
  nachschlagFaehigkeiten,
} from '../faehigkeiten/nachschlagFeld'
import type { Spalte } from '../faehigkeiten/spalten'
import { vorschlagStil } from '../faehigkeiten/vorschlagListe'
import { wertAbgemeldet, wertAngemeldet } from '../faehigkeiten/wertAnschluss'
import { feldStil } from './feldStil'

const FELD_TYPEN = ['text', 'number', 'textarea', 'select', 'date', 'time', 'checkbox', 'nachschlagen'] as const

type FeldTyp = (typeof FELD_TYPEN)[number]

function feldTypVon(v: unknown): FeldTyp {
  return FELD_TYPEN.includes(v as FeldTyp) ? (v as FeldTyp) : 'text'
}

const MIT_PLATZHALTER: readonly FeldTyp[] = [
  'text', 'number', 'textarea', 'select', 'nachschlagen', 'date', 'time',
]

const PH_KLASSE: Partial<Record<FeldTyp, string>> = {
  select: 'ph-select',
  date: 'ph-nativ',
  time: 'ph-nativ',
  nachschlagen: 'ph-nachschlag',
}

const NUR_NACHSCHLAGEN: Bedingung = { schluessel: 'feldTyp', gleich: 'nachschlagen' }

const OHNE_WERT: readonly FeldTyp[] = ['checkbox', 'nachschlagen']

// Der Browser will das Datum als JJJJ-MM-TT, SoftEngine schreibt TT.MM.JJJJ.
function datumFuerEingabe(wert: string): string {
  const deutsch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(wert)
  return deutsch ? `${deutsch[3]}-${deutsch[2]}-${deutsch[1]}` : wert
}

function datumAusEingabe(wert: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : wert
}

export class FormFeld extends Grundbaustein {
  static readonly typ = 'formfeld'
  static readonly tag = 'ff-formfeld'
  static readonly anzeigeName = 'Formularfeld'
  static readonly kategorie: Kategorie = 'eingabe'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle', wenn: { schluessel: 'feldTyp', ungleich: 'nachschlagen' } },
    { art: 'auswahlFolgen' },
    ...nachschlagFaehigkeiten(NUR_NACHSCHLAGEN),
    bindbar<typeof FormFeld.vorgaben>([
      {
        prop: 'wert',
        name: 'Wert',
        wenn: { schluessel: 'feldTyp', keinesVon: OHNE_WERT },
        vorschauProp: 'beschriftung',
      },
    ]),
    aktionswert<typeof FormFeld.vorgaben>([{ prop: 'wert', name: 'Wert' }]),
    { art: 'ereignisse', liste: [{ schluessel: 'onChange', name: 'Wert geändert' }] },
  ]

  static readonly vorgaben = {
    feldTyp: 'text',
    beschriftung: 'Feldname',
    optionen: '',
    quelle: '',
    wert: '',
    wertField: '',
    ...NACHSCHLAG_VORGABEN,
    darstellung: 'standard',
  }

  static readonly raster = { startBreite: 12, startHoehe: 2, minBreite: 4, minHoehe: 2 }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'feldTyp',
      name: 'Feldtyp',
      beschreibung: 'Welche Art Eingabe das Feld annimmt.',
      art: 'select',
      optionen: [
        { wert: 'text', name: 'Text' },
        { wert: 'number', name: 'Zahl' },
        { wert: 'textarea', name: 'Mehrzeilig' },
        { wert: 'select', name: 'Auswahl' },
        { wert: 'date', name: 'Datum' },
        { wert: 'time', name: 'Uhrzeit' },
        { wert: 'checkbox', name: 'Ankreuzfeld' },
        { wert: 'nachschlagen', name: 'Nachschlagen' },
      ],
    },
    {
      schluessel: 'optionen',
      name: 'Auswahl-Optionen',
      beschreibung: 'Einträge durch Komma getrennt, z. B. "Zimmer 1, Zimmer 2".',
      art: 'text',
      wenn: { schluessel: 'feldTyp', gleich: 'select' },
    },
    ...nachschlagEigenschaften(NUR_NACHSCHLAGEN),
    {
      schluessel: 'wertField',
      name: 'Feld',
      beschreibung: 'Feld, dessen Wert angezeigt wird.',
      art: 'field',
      // Das Ankreuzfeld bleibt unbindbar, bis der SE-Wert-Kontrakt belegt ist.
      wenn: { schluessel: 'feldTyp', keinesVon: OHNE_WERT },
    },
    {
      schluessel: 'darstellung',
      name: 'Darstellung',
      beschreibung: 'Kasten oder dezente Linie (z. B. Unterschriftsbereich).',
      art: 'select',
      optionen: [
        { wert: 'standard', name: 'Standard (Kasten)' },
        { wert: 'linie', name: 'Linie (Unterstrichen)' },
      ],
      wenn: { schluessel: 'feldTyp', keinesVon: ['checkbox'] },
    },
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, feldStil, vorschlagStil]

  @property() feldTyp = 'text'

  @property() beschriftung = 'Feldname'

  @property() optionen = ''

  @property() quelle = ''

  @property() wert = ''

  @property() wertField = ''

  @property() nachschlagQuelle = ''

  @property() speicherFeld = ''

  @property() speicherTitel = ''

  @property({
    converter: {
      fromAttribute: (v: string | null): Spalte[] => coerceNachschlagSpalten(v ?? ''),
      toAttribute: (v: Spalte[]): string => JSON.stringify(v),
    },
  })
  nachschlagSpalten: Spalte[] = []

  @property({ type: Number }) fensterBreite = NACHSCHLAG_VORGABEN.fensterBreite

  @property({ type: Number }) fensterHoehe = NACHSCHLAG_VORGABEN.fensterHoehe

  @property() einzigerTreffer = 'nein'

  @property() darstellung = 'standard'

  @state() private angehakt = false

  @state() private imSteuerelement = false

  private readonly _nachschlag = new NachschlagFeld({
    baustein: this,
    melde: () => this.requestUpdate(),
    imEditor: () => this.imEditor,
    quelle: () => this.nachschlagQuelle,
    speicherFeld: () => this.speicherFeld,
    speicherTitel: () => this.speicherTitel,
    spalten: () => coerceNachschlagSpalten(this.nachschlagSpalten),
    titel: () => this.beschriftung,
    breite: () => this.fensterBreite,
    hoehe: () => this.fensterHoehe,
    einzigerTreffer: () => this.einzigerTreffer === 'ja',
    wert: () => this.wert,
    setzeWert: (wert) => { this.wert = wert },
    geaendert: () => this.dispatchEvent(new Event('change')),
  })

  // Der Vertrag der Faehigkeit Wertanschluss: beim Nachschlagen fuellt das Feld
  // seinen Wert selbst, dann haelt der Datenstrom sich heraus.
  fuelltSelbst(): boolean {
    return feldTypVon(this.feldTyp) === 'nachschlagen'
  }

  pruefeEigenenWert(): void {
    if (this.fuelltSelbst()) this._nachschlag.pruefeWert()
  }

  private onInput(e: Event): void {
    const ziel = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    this.wert = feldTypVon(this.feldTyp) === 'date' ? datumAusEingabe(ziel.value) : ziel.value
  }

  private onChange(): void {
    this.dispatchEvent(new Event('change'))
  }

  // `gebunden` sperrt das Umbenennen: dort zeigt der Platzhalter den Klarnamen
  // des Feldes, Tippen ginge ins Leere.
  private textTpl(cls: string, hidden = false, gebunden = false): TemplateResult {
    return html`<span
      class=${cls}
      ?hidden=${hidden}
      ?data-ff-bound=${gebunden}
      data-ff-editable
      @click=${this.onTextClick}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'beschriftung')}
    >${this.beschriftung}</span>`
  }

  private onTextClick(): void {
    if (this.imEditor) return
    this.setzeHaken(!this.angehakt)
  }

  private setzeHaken(an: boolean): void {
    if (this.angehakt === an) return
    this.angehakt = an
    this.dispatchEvent(new Event('change'))
  }

  private steuerTpl(art: FeldTyp): TemplateResult {
    switch (art) {
      case 'textarea':
        return html`<textarea class="ctrl" .value=${this.wert} @input=${this.onInput} @change=${this.onChange}></textarea>`
      case 'select': {
        const eintraege = this.optionen.split(',').map((o) => o.trim()).filter((o) => o !== '')
        const fremdwert = this.wert !== '' && !eintraege.includes(this.wert)
        return html`<select class="ctrl" .value=${this.wert} @input=${this.onInput} @change=${this.onChange}>
          <option value="" disabled hidden></option>
          ${fremdwert ? html`<option value=${this.wert} hidden>${this.wert}</option>` : nothing}
          ${eintraege.length === 0
            ? html`<option disabled>(keine Optionen)</option>`
            : eintraege.map((o) => html`<option value=${o}>${o}</option>`)}
        </select>`
      }
      case 'nachschlagen':
        return this._nachschlag.zeichne('ctrl', this.beschriftung)
      default:
        return html`<input
          class="ctrl"
          type=${art}
          .value=${art === 'date' ? datumFuerEingabe(this.wert) : this.wert}
          @input=${this.onInput}
          @change=${this.onChange}
          @focus=${() => { this.imSteuerelement = true }}
          @blur=${() => { this.imSteuerelement = false }}
        />`
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this._nachschlag.ziehNach()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Die Liste haengt unten aus dem Baustein heraus; Raster-Kinder stapeln in
    // DOM-Reihenfolge, also muss dieses Feld solange ueber seinen Nachbarn liegen.
    this.toggleAttribute('data-ff-liste', this._nachschlag.listeOffen)
  }

  override render(): TemplateResult {
    const art = feldTypVon(this.feldTyp)
    if (art === 'checkbox') {
      return html`<div class="feld">
        <div class="zeile">
          <input
            class="ctrl"
            type="checkbox"
            .checked=${this.angehakt}
            @change=${(e: Event) => this.setzeHaken((e.target as HTMLInputElement).checked)}
          />
          ${this.textTpl('text')}
        </div>
      </div>`
    }

    const wertBindbar = art !== 'nachschlagen'
    const imFeld = wertBindbar ? this.wert : this._nachschlag.imFeld
    const leer = imFeld === ''
    const huelleKlassen = `huelle${leer ? ' leer' : ''}${this.imSteuerelement ? ' tippt' : ''}`
    const feldKlassen = `feld${this.darstellung === 'linie' ? ' linie' : ''}`
    return html`<div class=${feldKlassen}>
      <div
        class=${huelleKlassen}
        data-ff-spot=${wertBindbar ? 'wert' : nothing}
        ?data-ff-bound=${wertBindbar && this.wertField !== ''}
      >
        ${this.steuerTpl(art)}
        ${MIT_PLATZHALTER.includes(art)
          ? this.textTpl(`ph ${PH_KLASSE[art] ?? ''}`.trim(), !leer, wertBindbar && this.wertField !== '')
          : nothing}
      </div>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    wertAngemeldet(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    wertAbgemeldet(this)
    this._nachschlag.aufraeumen()
  }
}

Grundbaustein.defineAndRegister(FormFeld)
