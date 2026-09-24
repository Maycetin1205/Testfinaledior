import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable, bindingAttr } from '../../core/block/capability'
import { readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink, sourceIdOf } from '../../runtime/source'
import { textStyle } from './textStyle'
import { textProperties, type TextValues } from './properties'

const ALIGNS: Record<string, string> = { left: 'left', center: 'center', right: 'right' }

const TEXT_BINDING = bindingAttr('text')

export interface Text extends TextValues {}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'

  static override styles: CSSResultGroup = [BlockElement.styles, textStyle]

  override render(): TemplateResult {
    return html`<div
      class="text variant-${this.variant}"
      style=${styleMap({ textAlign: ALIGNS[this.align] ?? ALIGNS.left })}
      data-ff-editable
      data-ff-spot="text"
      ?data-ff-bound=${this.textField !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'text')}
    >${this.text}</div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }
}

const link = makeDataLink<Text>({
  hydrate: (el) => {
    const spot = readBoundSpot(el, TEXT_BINDING)
    if (spot.kind === 'unbound') return
    el.text = spot.kind === 'value' ? spot.value : ''
  },
  wire: (el) => {
    if (sourceIdOf(el) !== '' && el.getAttribute(TEXT_BINDING)) el.text = ''
  },
})

defineBlock(Text, {
  name: 'Text',
  category: 'display',
  properties: textProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'followsSelection' },
    bindable<typeof textProperties>([{ prop: 'text', name: 'Text' }]),
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 2, minHeight: 1 },
})
