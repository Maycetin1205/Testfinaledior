// Baustein Formularfeld: eine Stelle fuer einen Wert, in sechs Typen plus Nachschlagen.
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { BasicBlock } from '../base/BasicBlock'
import type { BlockCategory } from '../../core/blocks/BlockComponent'
import { aktionswert, bindbar, type Faehigkeit } from '../../core/blocks/faehigkeiten'
import { geberIdVon, klareAuswahl, setzeAuswahl } from '../shared/auswahl'
import { vorschlagStil } from '../shared/vorschlagListe'
import { vorschlaegeImFensterStand } from '../tabelle/nachschlagStand'
import { automatikSpalten } from '../tabelle/nachschlagen'
import { tasteVon, VorschlagStand } from '../shared/vorschlagStand'
import { eingabeStelleTpl } from '../shared/zellenEingabe'
import { FELD_EIGENSCHAFTEN } from './feldEigenschaften'
import {
  connectField,
  dateValueToInput,
  disconnectField,
  inputValueToDate,
} from './feldRuntime'
import { feldStil } from './feldStil'
import {
  coerceFeldTyp,
  MIT_PLATZHALTER,
  PH_KLASSE,
  type FeldTyp,
} from './feldTypen'
import { lupeZeichen } from '../tabelle/lupeZeichen'
import {
  coerceNachschlagSpalten,
  einzigenTrefferFinden,
  type Eintrag,
  FENSTER_BREITE,
  FENSTER_HOEHE,
  folgeBeimVerlassen,
  holeEintraege,
  NACHSCHLAG_SPALTEN_BINDUNG,
  oeffneNachschlagen,
  satzPasstZurAuswahl,
  schliesseNachschlagenFuer,
} from '../tabelle/nachschlagen'
import type { Spalte } from '../tabelle/spalten'

export class FormFeldBlock extends BasicBlock {
  static readonly blockType = 'formfeld'
  static readonly tagName = 'ff-formfeld'
  static readonly displayName = 'Formularfeld'
  static readonly category: BlockCategory = 'eingabe'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle', wenn: { attributeName: 'fieldType', notEquals: 'nachschlagen' } },
    { art: 'auswahlFolgen' },
    // Das Feld GIBT seine Zeile: beim Typ Nachschlagen die im Fenster gewaehlte,
    // sonst die angezeigte Zeile seiner Datenquelle.
    {
      art: 'satzwahl',
      quelleProp: 'nachschlagQuelle',
      wenn: { attributeName: 'fieldType', equals: 'nachschlagen' },
    },
    { art: 'liste', bindung: NACHSCHLAG_SPALTEN_BINDUNG },
    // Die Angaben des Fensters wohnen am Feld; eingestellt wird es IM Fenster,
    // das die Lupe aufmacht.
    {
      art: 'suchfenster',
      fenster: {
        spaltenKey: 'nachschlagSpalten',
        breiteKey: 'fensterBreite',
        hoeheKey: 'fensterHoehe',
        quelleProp: 'nachschlagQuelle',
        speicherFeldProp: 'speicherFeld',
        speicherTitelProp: 'speicherTitel',
        automatik: 'Ohne Spalten zeigt das Fenster eine: das gespeicherte Feld.'
          + ' Die erste Spalte ist, was nach der Wahl im Feld steht.',
        stelle: '.lupe',
        wenn: { attributeName: 'fieldType', equals: 'nachschlagen' },
      },
    },
    bindbar<typeof FormFeldBlock.defaultProps>([
      {
        prop: 'value',
        label: 'Wert',
        wenn: { attributeName: 'fieldType', keinesVon: ['checkbox', 'nachschlagen'] satisfies readonly FeldTyp[] },
        vorschauProp: 'placeholder',
      },
    ]),
    aktionswert<typeof FormFeldBlock.defaultProps>([{ prop: 'value', label: 'Wert' }]),
    { art: 'ereignisse', liste: [{ key: 'onChange', name: 'Wert geändert' }] },
  ]

  static readonly defaultProps = {
    width: 240,
    fieldType: 'text',
    placeholder: 'Feldname',
    options: '',
    source: '',
    value: '',
    valueField: '',

    nachschlagQuelle: '',
    speicherFeld: '',
    speicherTitel: '',

    nachschlagSpalten: [] as Spalte[],

    fensterBreite: FENSTER_BREITE,
    fensterHoehe: FENSTER_HOEHE,

    einzigerTreffer: 'nein',
    darstellung: 'standard',
  }

  static readonly raster = { startW: 12, startH: 2, minW: 4, minH: 2 }

  static override readonly customProperties = FELD_EIGENSCHAFTEN

  static override styles = [BasicBlock.styles, feldStil, vorschlagStil]

  @property() fieldType = 'text'
  @property() placeholder = 'Feldname'
  @property() options = ''
  @property() source = ''
  @property() value = ''
  @property() valueField = ''
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
  @property({ type: Number }) fensterBreite = FENSTER_BREITE
  @property({ type: Number }) fensterHoehe = FENSTER_HOEHE
  @property() einzigerTreffer = 'nein'
  @property() darstellung = 'standard'

  @state() private anzeige = ''

  @state() private getippt: string | null = null

  // In willUpdate gefuellt, damit render und die Tastatur denselben Stand sehen.
  private readonly liste = new VorschlagStand<Eintrag>()

  private satz: unknown = undefined

  @state() private angehakt = false

  @state() private imSteuerelement = false

  private onInput(e: Event): void {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    this.value = coerceFeldTyp(this.fieldType) === 'date'
      ? inputValueToDate(t.value)
      : t.value
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
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'placeholder')}
    >${this.placeholder}</span>`
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

  private controlTpl(typ: FeldTyp): TemplateResult {
    switch (typ) {
      case 'textarea':
        return html`<textarea class="ctrl" .value=${this.value} @input=${this.onInput} @change=${this.onChange}></textarea>`
      case 'select': {
        const eintraege = this.options.split(',').map((o) => o.trim()).filter((o) => o !== '')
        const fremdwert = this.value !== '' && !eintraege.includes(this.value)
        return html`<select class="ctrl" .value=${this.value} @input=${this.onInput} @change=${this.onChange}>
          <option value="" disabled hidden></option>
          ${fremdwert ? html`<option value=${this.value} hidden>${this.value}</option>` : nothing}
          ${eintraege.length === 0
            ? html`<option disabled>(keine Optionen)</option>`
            : eintraege.map((o) => html`<option value=${o}>${o}</option>`)}
        </select>`
      }
      case 'nachschlagen':

        return eingabeStelleTpl({
          wert: this.getippt ?? this.anzeige,
          titel: this.placeholder,
    // Der Platzhalter des Feldes ist eine eigene Schicht ueber dem Kasten.
          platzhalter: '',
          klasse: 'ctrl',
          halterKlasse: 'nachschlag',
          vorschlaege: this.liste.treffer,
          marke: this.liste.marke,
          neben: html`<button
            class="lupe"
            type="button"
            aria-label="Nachschlagen"
            title="Nachschlagen"
            @click=${() => this.onLupe()}
          >${lupeZeichen()}</button>`,
        }, {
          tippen: (wert) => {
            this.getippt = wert
            this.liste.vonVorn()
          },
          taste: (e) => this.onNachschlagTaste(e),
          verlassen: () => this.onNachschlagVerlassen(),
          waehleVorschlag: (i) => this.uebernimmVorschlag(i),
          setzeMarke: (i) => {
            this.liste.setzeMarke(i)
            this.requestUpdate()
          },
        })
      default:

        return html`<input
          class="ctrl"
          type=${typ}
          .value=${typ === 'date' ? dateValueToInput(this.value) : this.value}
          @input=${this.onInput}
          @change=${this.onChange}
          @focus=${() => { this.imSteuerelement = true }}
          @blur=${() => { this.imSteuerelement = false }}
        />`
    }
  }

  // Im Editor faengt der Wirt den Klick auf die Lupe ab und oeffnet die
  // Inspector-Sektion; der Baustein zeichnet dafuer nichts.
  private onLupe(suchtext = ''): void {
    if (this.imEditor) return
    oeffneNachschlagen({
      el: this,
      quelleId: this.nachschlagQuelle,
      speicherFeld: this.speicherFeld,
      speicherTitel: this.speicherTitel,
      spalten: this.nachschlagSpalten,
      titel: this.placeholder,
      breite: this.fensterBreite,
      hoehe: this.fensterHoehe,
      suchtext,
      // Zurueck ins Feld, nicht auf die Lupe: wer Esc drueckt, will weitertippen.
      rueckFokus: () => this.shadowRoot?.querySelector<HTMLInputElement>('.nachschlag .ctrl')?.focus(),
      onUebernehmen: (anzeige, wert, satz) => this.uebernimmUndMelde(anzeige, wert, satz),
    })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.liste.zeige(this.berechneVorschlaege())
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Die Liste haengt unten aus dem Baustein heraus; Raster-Kinder stapeln in
    // DOM-Reihenfolge, also muss dieses Feld solange ueber seinen Nachbarn liegen.
    this.toggleAttribute('data-ff-liste', this.liste.offen)
  }

  // Die Vorschlaege kommen aus DERSELBEN Quelle wie das grosse Fenster, nur
  // gefiltert und gekuerzt. Ohne Quelle bleibt die Liste still leer: eine Meldung
  // bei jedem Tastendruck waere unbrauchbar.
  private berechneVorschlaege(): Eintrag[] {
    if (this.liste.zugemacht) return []
    if (this.getippt === null && !this.liste.aufgemacht) return []
    if (coerceFeldTyp(this.fieldType) !== 'nachschlagen') return []
    if (this.imEditor) return []
    const ergebnis = holeEintraege({
      el: this,
      quelleId: this.nachschlagQuelle,
      speicherFeld: this.speicherFeld,
      spalten: this.nachschlagSpalten,
    })
    if (!ergebnis.ok) return []
    // Aufgemacht heisst alles zeigen, sonst bleibt die Liste dem Getippten
    // vorbehalten.
    const getippt = this.getippt ?? ''
    if (getippt === '' && !this.liste.aufgemacht) return []
    return vorschlaegeImFensterStand(ergebnis.eintraege, getippt,
      this.nachschlagSpalten.length > 0 ? this.nachschlagSpalten : automatikSpalten(this), this)
  }

  // Escape kommt hier NICHT an, wenn ein Fenster offen ist: dessen Rahmen hoert
  // am window in der Abfang-Phase und schliesst sich selbst.
  private onNachschlagTaste(e: KeyboardEvent): void {
    if (e.key === 'F5' && !this.imEditor) e.preventDefault()
    if (this.imEditor) return
    const folge = this.liste.folgeFuer(tasteVon(e), {
      listeOffen: this.liste.offen,
      feldLeer: (this.getippt ?? this.anzeige) === '',
      getippt: this.getippt !== null,
      nachschlagbar: true,
    // Das Fenster meldet selbst, wenn Quelle oder „Gespeichert wird" fehlen;
    // darum darf hier jede Taste hineinlaufen.
      hatSaetze: () => true,
    // Ein Feld hat keine naechste Zelle: weiter fuehrt der Browser mit Tab.
      springt: false,
    })
    if (folge === 'nichts') {
      if (e.key === 'Enter') e.preventDefault()
      return
    }
    // Nach der Uebernahme mit Tab geht der Fokus weiter, wie der Browser ihn
    // fuehrt; jede andere Taste bleibt im Feld.
    if (e.key !== 'Tab') e.preventDefault()
    if (folge === 'uebernehmen') this.uebernimmVorschlag(this.liste.marke)
    else if (folge === 'fenster') this.onLupe(this.getippt ?? '')
    else if (folge === 'liste-auf') this.liste.aufmachen()
    else if (folge === 'leeren') {
      this.getippt = null
      this.leereNachschlagen()
      this.dispatchEvent(new Event('change'))
    }
    this.requestUpdate()
  }

  private uebernimmVorschlag(index: number): void {
    const treffer = this.liste.treffer[index]
    if (!treffer) return
    this.uebernimmUndMelde(treffer.anzeige, treffer.wert, treffer.satz)
  }

  private leereNachschlagen(): void {
    this.satz = undefined
    this.anzeige = ''
    this.value = ''
    this.liste.ruhe()
    klareAuswahl(geberIdVon(this))
  }

  // Der eine Uebernahme-Weg fuer den Bediener: Zeilenklick im Fenster und Wahl in
  // der Vorschlagsliste landen beide hier.
  private uebernimmUndMelde(anzeige: string, wert: string, satz: unknown): void {
    this.getippt = null
    this.liste.ruhe()
    this.uebernimmSatz(anzeige, wert, satz)
    this.dispatchEvent(new Event('change'))
  }

  private uebernimmSatz(anzeige: string, wert: string, satz: unknown): void {
    this.anzeige = anzeige !== '' ? anzeige : wert
    this.value = wert
    this.satz = satz

    // Hier hat ein MENSCH den Satz gewaehlt; sonst bremste die Kreis-Bremse der
    // holenden Quellen die Rueckkehr zu einem schon gewaehlten Beleg aus.
    setzeAuswahl(geberIdVon(this), satz, true)
  }

  private onNachschlagVerlassen(): void {
    if (this.imEditor) return
    const folge = folgeBeimVerlassen(this.getippt ?? this.anzeige, this.anzeige, this.value)
    this.getippt = null
    this.liste.ruhe()
    if (folge !== 'leeren') return
    this.leereNachschlagen()
    this.dispatchEvent(new Event('change'))
  }

  pruefeEigenenWert(): void {
    if (coerceFeldTyp(this.fieldType) !== 'nachschlagen') return
    // Trifft der Daten-Push erst nach dem ersten Tastendruck ein, muss die
    // offene Liste nachziehen.
    if (this.getippt !== null) this.requestUpdate()
    if (this.satz !== undefined && !satzPasstZurAuswahl(this, this.satz)) {
      this.leereNachschlagen()
    }
    this.uebernimmEinzigenTreffer()
  }

  private uebernimmEinzigenTreffer(): void {
    if (this.einzigerTreffer !== 'ja') return
    const ergebnis = holeEintraege({
      el: this,
      quelleId: this.nachschlagQuelle,
      speicherFeld: this.speicherFeld,
      spalten: this.nachschlagSpalten,
    })
    if (!ergebnis.ok) return
    const treffer = einzigenTrefferFinden(ergebnis.eintraege, this.satz === undefined)
    if (treffer) this.uebernimmSatz(treffer.anzeige, treffer.wert, treffer.satz)
  }

  override render(): TemplateResult {
    const typ = coerceFeldTyp(this.fieldType)
    if (typ === 'checkbox') {
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

    const wertBindbar = typ !== 'nachschlagen'

    const imFeld = wertBindbar ? this.value : (this.getippt ?? this.anzeige)

    const leer = imFeld === ''

    const huelleKlassen = `huelle${leer ? ' leer' : ''}${this.imSteuerelement ? ' tippt' : ''}`
    const feldKlassen = `feld${this.darstellung === 'linie' ? ' linie' : ''}`
    return html`<div class=${feldKlassen}>
      <div
        class=${huelleKlassen}
        data-ff-spot=${wertBindbar ? 'value' : nothing}
        ?data-ff-bound=${wertBindbar && this.valueField !== ''}
      >
        ${this.controlTpl(typ)}
        ${MIT_PLATZHALTER.includes(typ)
          ? this.textTpl(`ph ${PH_KLASSE[typ] ?? ''}`.trim(), !leer, wertBindbar && this.valueField !== '')
          : nothing}
      </div>
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectField(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    disconnectField(this)
    schliesseNachschlagenFuer(this)
  }
}

BasicBlock.defineAndRegister(FormFeldBlock)
