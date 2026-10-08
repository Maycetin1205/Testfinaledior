import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeight } from '../base/heightReport'
import { bindable, bindingAttr } from '../../core/block/capability'
import { readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink, sourceIdOf } from '../../runtime/source'
import { lookClass, lookStyle } from '../look/look'
import { textStyle } from './textStyle'
import { TEXT_SIZES, textProperties, type TextValues } from './properties'

const ALIGNS = ['left', 'center', 'right']

const TEXT_BINDING = bindingAttr('text')

// Without a choice of its own the role decides.
const tokenOf = (token: string | undefined): string | undefined => (token ? `var(${token})` : undefined)

export interface Text extends TextValues {}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, textStyle]

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.text'))
  }

  // The size of a text is its own; color and emphasis come from the look.
  override render(): TemplateResult {
    const align = ALIGNS.includes(this.align) ? this.align : 'left'
    return html`<div
      class="text variant-${this.variant} align-${align} ${lookClass({ tone: this.tone, emphasis: this.emphasis })}"
      style=${styleMap({ fontSize: tokenOf(TEXT_SIZES[this.size]) })}
      data-ff-editable
      data-ff-spot="text"
      ?data-ff-bound=${this.textField !== ''}
      @click=${this.reportSpot}
      @dblclick=${(e: MouseEvent) => {
        this.reportSpot(e)
        this.inlineEdit(e, 'text')
      }}
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
    { kind: 'source', after: 'text' },
    { kind: 'followsSelection' },
    bindable<typeof textProperties>([{ prop: 'text', name: 'Text' }]),
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 2, minHeight: 1, heightFromContent: true },
})
