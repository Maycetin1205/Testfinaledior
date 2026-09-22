import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import { bindable, type BindingProp, type Capability } from '../../core/block/capability'
import type { FlowWidth } from '../../core/block/flow'
import { fieldProperty, textProperty } from '../../core/block/property'
import {
  toneProperty,
  toneStyle,
  toneValue,
  type ToneValue,
} from '../behavior/tone'
import { cardsStyle } from './cardStyle'

type TextSpot = 'heading' | 'heading2' | 'time' | 'date' | 'subline' | 'text'

export class Card extends BlockElement {
  static readonly type = 'card'
  static readonly tag = 'ff-card'
  static readonly displayName = 'Karte'
  static readonly category: Category = 'display'

  static readonly allowedParent = ['kanban']
  static readonly inPalette = false

  static readonly fixedWidth: FlowWidth = 'fill'
  static readonly widthEditable = false

  static readonly blockProperties = {
    chipTone: toneProperty(
      'Bedeutung des Chips auf der Karte — bestimmt die Chip-Farbe.',
      'chiptone',
    ),
    heading: textProperty({
      default: '',
      label: 'Titel',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'heading',
    }),
    heading2: textProperty({
      default: '',
      label: 'Titel 2',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'heading2',
    }),
    time: textProperty({
      default: '',
      label: 'Zeit',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'time',
    }),
    date: textProperty({
      default: '',
      label: 'Datum',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'date',
    }),
    subline: textProperty({
      default: '',
      label: 'Unterzeile',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'subline',
    }),
    text: textProperty({
      default: '',
      label: 'Textzeile',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'text',
    }),
    chip: textProperty({
      default: '',
      label: 'Chip',
      help: 'Was an dieser Stelle der Karte steht.',
      place: 'block',
      attribute: 'chip',
    }),
    headingField: fieldProperty({
      default: '',
      label: 'Titel — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'headingfield',
    }),
    heading2Field: fieldProperty({
      default: '',
      label: 'Titel 2 — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'heading2field',
    }),
    timeField: fieldProperty({
      default: '',
      label: 'Zeit — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'timefield',
    }),
    dateField: fieldProperty({
      default: '',
      label: 'Datum — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'datefield',
    }),
    sublineField: fieldProperty({
      default: '',
      label: 'Unterzeile — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'sublinefield',
    }),
    textField: fieldProperty({
      default: '',
      label: 'Textzeile — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'textfield',
    }),
    chipField: fieldProperty({
      default: '',
      label: 'Chip — Feld',
      help: 'Das Feld, dessen Wert an dieser Stelle steht.',
      place: 'none',
      attribute: 'chipfield',
    }),
  }

  static readonly capabilities: readonly Capability[] = [
    bindable<typeof Card.blockProperties>([
      { prop: 'time', name: 'Zeit' },
      { prop: 'date', name: 'Datum' },
      { prop: 'heading', name: 'Titel' },
      { prop: 'heading2', name: 'Titel 2' },
      { prop: 'subline', name: 'Unterzeile' },
      { prop: 'text', name: 'Textzeile' },
      { prop: 'chip', name: 'Chip' },
    ]),
  ]

  static override styles: CSSResultGroup = [BlockElement.styles, toneStyle, cardsStyle]

  chipTone: ToneValue = 'info'
  heading = ''
  heading2 = ''
  time = ''
  date = ''
  subline = ''
  text = ''
  chip = ''
  headingField = ''
  heading2Field = ''
  timeField = ''
  dateField = ''
  sublineField = ''
  textField = ''
  chipField = ''

  private spot(prop: TextSpot | 'chip', klasse: string): TemplateResult {
    return html`<span
      class=${klasse}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field` satisfies BindingProp<TextSpot | 'chip'>] !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  override render(): TemplateResult {
    const world = toneValue(this.chipTone)

    const inEditor = this.inEditor
    const shows = (value: string): boolean => inEditor || value.trim() !== ''

    const foot = shows(this.heading2) || shows(this.date) || shows(this.time) || shows(this.chip)
    return html`<div class="karte">
      ${shows(this.heading) ? this.spot('heading', 'name') : nothing}
      ${shows(this.subline) ? this.spot('subline', 'extra') : nothing}
      ${shows(this.text) ? this.spot('text', 'base') : nothing}
      ${foot
        ? html`<div class="fuss">
            ${shows(this.heading2) ? this.spot('heading2', 'fussl') : nothing}
            ${shows(this.date) ? this.spot('date', 'date') : nothing}
            ${shows(this.time) ? this.spot('time', 'time') : nothing}
            ${shows(this.chip) ? this.spot('chip', `chip v-${world}`) : nothing}
          </div>`
        : nothing}
    </div>`
  }
}

BlockElement.defineAndRegister(Card)
