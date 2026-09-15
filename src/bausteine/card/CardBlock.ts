// Baustein Karte: ein Kaertchen mit Titel, Text, Datum und Chip.
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import { bindbar, type BindungsProp, type Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import {
  chipStyles,
  coerceStatusVariant,
  statusVariantProperty,
  type StatusVariant,
} from '../shared/statusVariant'
import { kartenStil } from './kartenStil'

type TextSpotProp = 'heading' | 'heading2' | 'time' | 'date' | 'meta' | 'text'

export class CardBlock extends Grundbaustein {
  static readonly typ = 'card'
  static readonly tag = 'ff-card'
  static readonly anzeigeName = 'Karte'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly erlaubteEltern = ['kanban-muster']
  static readonly inPalette = false

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false

  static readonly vorgaben = {
    chipVariant: 'info',
    heading: '',
    heading2: '',
    time: '',
    date: '',
    meta: '',
    text: '',
    chipText: '',

    headingField: '',
    heading2Field: '',
    timeField: '',
    dateField: '',
    metaField: '',
    textField: '',
    chipTextField: '',
  }

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    bindbar<typeof CardBlock.vorgaben>([
      { prop: 'time', name: 'Zeit' },
      { prop: 'date', name: 'Datum' },
      { prop: 'heading', name: 'Titel' },
      { prop: 'heading2', name: 'Titel 2' },
      { prop: 'meta', name: 'Unterzeile' },
      { prop: 'text', name: 'Textzeile' },
      { prop: 'chipText', name: 'Chip' },
    ]),
  ]

  static override readonly eigenschaften: Eigenschaft[] = [
    statusVariantProperty(
      'chipVariant',
      'Bedeutung des Chips auf der Karte — bestimmt die Chip-Farbe.',
    ),
  ]

  static override styles = [Grundbaustein.styles, chipStyles, kartenStil]

  @property() chipVariant: StatusVariant = 'info'
  @property() heading = ''
  @property() heading2 = ''
  @property() time = ''
  @property() date = ''
  @property() meta = ''
  @property() text = ''
  @property() chipText = ''
  @property() headingField = ''
  @property() heading2Field = ''
  @property() timeField = ''
  @property() dateField = ''
  @property() metaField = ''
  @property() textField = ''
  @property() chipTextField = ''

  private stelle(prop: TextSpotProp, klass: string): TemplateResult {
    return html`<span
      class=${klass}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field` satisfies BindungsProp<TextSpotProp>] !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  override render(): TemplateResult {
    const v = coerceStatusVariant(this.chipVariant)

    const editor = this.imEditor
    const zeigt = (wert: string) => editor || wert.trim() !== ''

    const fuss = zeigt(this.heading2) || zeigt(this.date) || zeigt(this.time)
      || zeigt(this.chipText)
    return html`<div class="card">
      ${zeigt(this.heading) ? this.stelle('heading', 'name') : nothing}
      ${zeigt(this.meta) ? this.stelle('meta', 'zusatz') : nothing}
      ${zeigt(this.text) ? this.stelle('text', 'grund') : nothing}
      ${fuss
        ? html`<div class="fuss">
            ${zeigt(this.heading2) ? this.stelle('heading2', 'fussl') : nothing}
            ${zeigt(this.date) ? this.stelle('date', 'datum') : nothing}
            ${zeigt(this.time) ? this.stelle('time', 'zeit') : nothing}
            ${zeigt(this.chipText)
              ? html`<span
                  class="chip v-${v}"
                  data-ff-editable
                  data-ff-spot="chipText"
                  ?data-ff-bound=${this.chipTextField !== ''}
                  @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'chipText')}
                >${this.chipText}</span>`
              : nothing}
          </div>`
        : nothing}
    </div>`
  }
}

Grundbaustein.defineAndRegister(CardBlock)
