import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable, type BindingProp } from '../../core/block/capability'
import { toneStyle, toneValue } from '../tone/tone'
import { cardsStyle } from './cardStyle'
import { cardProperties, type CardValues } from './properties'

type TextSpot = 'heading' | 'heading2' | 'time' | 'date' | 'subline' | 'text'

export interface Card extends CardValues {}

export class Card extends BlockElement {
  static readonly type = 'card'
  static readonly tag = 'ff-card'

  static override styles: CSSResultGroup = [BlockElement.styles, toneStyle, cardsStyle]

  private spot(prop: TextSpot | 'chip', className: string): TemplateResult {
    return html`<span
      class=${className}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field` satisfies BindingProp<TextSpot | 'chip'>] !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  override render(): TemplateResult {
    const tone = toneValue(this.chipTone)

    const inEditor = this.inEditor
    const shows = (value: string): boolean => inEditor || value.trim() !== ''

    const foot = shows(this.heading2) || shows(this.date) || shows(this.time) || shows(this.chip)
    return html`<div class="card">
      ${shows(this.heading) ? this.spot('heading', 'name') : nothing}
      ${shows(this.subline) ? this.spot('subline', 'extra') : nothing}
      ${shows(this.text) ? this.spot('text', 'text') : nothing}
      ${foot
        ? html`<div class="foot">
            ${shows(this.heading2) ? this.spot('heading2', 'foot-title') : nothing}
            ${shows(this.date) ? this.spot('date', 'date') : nothing}
            ${shows(this.time) ? this.spot('time', 'time') : nothing}
            ${shows(this.chip) ? this.spot('chip', `chip tone-${tone}`) : nothing}
          </div>`
        : nothing}
    </div>`
  }
}

defineBlock(Card, {
  name: 'Karte',
  category: 'display',
  properties: cardProperties,
  capabilities: [
    bindable<typeof cardProperties>([
      { prop: 'time', name: 'Zeit' },
      { prop: 'date', name: 'Datum' },
      { prop: 'heading', name: 'Titel' },
      { prop: 'heading2', name: 'Titel 2' },
      { prop: 'subline', name: 'Unterzeile' },
      { prop: 'text', name: 'Textzeile' },
      { prop: 'chip', name: 'Chip' },
    ]),
  ],
  allowedParent: ['kanban'],
  inPalette: false,
  fixedWidth: 'fill',
})
