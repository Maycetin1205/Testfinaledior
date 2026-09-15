// Baustein Karte: ein Kaertchen mit Titel, Text, Datum und Chip.
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BasicBlock } from '../base/BasicBlock'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import { bindbar, type BindungsProp, type Faehigkeit } from '../../core/blocks/faehigkeiten'
import type { FlussBreite } from '../../core/blocks/flowLayout'
import type { Eigenschaft } from '../../core/blocks/PropertyDescription'
import {
  chipStyles,
  coerceStatusVariant,
  statusVariantProperty,
  type StatusVariant,
} from '../shared/statusVariant'
import { kartenStil } from './kartenStil'

type TextSpotProp = 'heading' | 'heading2' | 'time' | 'date' | 'meta' | 'text'

export class CardBlock extends BasicBlock {
  static readonly blockType = 'card'
  static readonly tagName = 'ff-card'
  static readonly displayName = 'Karte'
  static readonly category: Kategorie = 'anzeige'

  static readonly allowedParentTypes = ['kanban-muster']
  static readonly showInPalette = false

  static readonly lockedWidth: FlussBreite = 'fill'
  static readonly resizableWidth = false

  static readonly defaultProps = {
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
    bindbar<typeof CardBlock.defaultProps>([
      { prop: 'time', label: 'Zeit' },
      { prop: 'date', label: 'Datum' },
      { prop: 'heading', label: 'Titel' },
      { prop: 'heading2', label: 'Titel 2' },
      { prop: 'meta', label: 'Unterzeile' },
      { prop: 'text', label: 'Textzeile' },
      { prop: 'chipText', label: 'Chip' },
    ]),
  ]

  static override readonly customProperties: Eigenschaft[] = [
    statusVariantProperty(
      'chipVariant',
      'Bedeutung des Chips auf der Karte — bestimmt die Chip-Farbe.',
    ),
  ]

  static override styles = [BasicBlock.styles, chipStyles, kartenStil]

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

BasicBlock.defineAndRegister(CardBlock)
