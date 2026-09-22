import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable, bindingAttr } from '../../core/block/capability'
import { TONES } from '../../core/block/tones'
import { readBoundSpot } from '../behavior/boundSpot'
import { makeDataLink, sourceIdOf } from '../behavior/source'
import { textStyle } from './textStyle'
import {
  NEUTRAL_COLORS,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_STANDARD,
  textProperties,
  type TextValues,
} from './properties'

const WEIGHTS: Record<string, string> = { thin: '300', normal: '400', bold: '700' }
const ALIGNS: Record<string, string> = { left: 'left', center: 'center', right: 'right' }

const COLORS: Record<string, string> = {
  ...Object.fromEntries(NEUTRAL_COLORS.map((f) => [f.value, `var(${f.token})`])),
  ...Object.fromEntries(TONES.map((f) => [f.value, `var(${f.strong})`])),
}

const TEXT_BINDING = bindingAttr('text')

function sizeOf(value: number): number {
  if (!Number.isFinite(value)) return SIZE_STANDARD
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, value))
}

export interface Text extends TextValues {}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'

  static override styles: CSSResultGroup = [BlockElement.styles, textStyle]

  override render(): TemplateResult {
    const style = {
      fontSize: `${sizeOf(this.size)}px`,
      fontWeight: WEIGHTS[this.weight] ?? WEIGHTS.normal,
      textAlign: ALIGNS[this.align] ?? ALIGNS.left,
      color: COLORS[this.color] ?? COLORS.standard,
    }

    return html`<div
      class="text"
      style=${styleMap(style)}
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
    if (spot.kind === 'ungebunden') return
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
