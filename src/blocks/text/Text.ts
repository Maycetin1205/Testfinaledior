import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { reportsHeight } from '../base/heightReport'
import { bindable, bindingAttr } from '../../core/block/capability'
import { asNumber, shownNumber } from '../../core/data/number'
import { hasRowToShow, readBoundSpot } from '../../runtime/boundSpot'
import { makeDataLink, sourceIdOf, spotValue } from '../../runtime/source'
import { makeFieldReader } from '../../runtime/foreignSources'
import { bindingFields } from '../../core/block/binding'
import { lookClass, lookStyle } from '../look/look'
import { symbolTpl } from '../look/symbol'
import { AMOUNT_DECIMALS, EURO_SUFFIX } from '../parts/column'
import { textStyle } from './textStyle'
import { TEXT_SIZES, textProperties, type TextValues } from './properties'

const ALIGNS = ['left', 'center', 'right']

const TEXT_BINDING = bindingAttr('text')

// Without a choice of its own the role decides.
const tokenOf = (token: string | undefined): string | undefined => (token ? `var(${token})` : undefined)

// A number as an amount, the German way; anything else as it is.
function asAmount(text: string, format: string): string {
  const n = format === '' ? null : asNumber(text)
  return n === null ? text : shownNumber(n, AMOUNT_DECIMALS) + (format === 'euro' ? EURO_SUFFIX : '')
}

// A number of zero or less, read the German way; any other text is none.
function notPositive(text: string): boolean {
  const n = asNumber(text)
  return n !== null && n <= 0
}

export interface Text extends TextValues {}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, textStyle]

  // In the mask: the text follows a selection and no row is chosen, or its
  // source holds no row.
  @state() withoutRow = false

  constructor() {
    super()
    reportsHeight(this, () => this.renderRoot.querySelector('.with-label') ?? this.renderRoot.querySelector('.text'))
  }

  // The size of a text is its own; color and emphasis come from the look.
  // The symbol stands before the words, which alone are typed and bound.
  // The frame is the block's room on the grid: the text stands at its top or
  // its bottom, the sum rule lies on its edges. With its label the text
  // stands under it, both as high as their lines.
  override render(): TemplateResult {
    const align = ALIGNS.includes(this.align) ? this.align : 'left'
    const withSymbol = this.symbol !== ''
    const look = lookClass({ tone: this.tone, emphasis: this.emphasis })
    const waiting = !this.preview && this.withoutRow ? this.withoutChoice : 'empty'
    const hinting = waiting === 'hint' && this.withoutHint !== ''
    // In the editor a bound value under its label shows the dash of an empty
    // field: the label names the field already.
    const dashOnly = this.preview && this.showLabel && this.textField !== ''
    const words = dashOnly ? '' : hinting ? this.withoutHint : asAmount(this.text, this.figureFormat)
    const empty = !hinting && words.trim() === ''
    const marks = [
      this.oneLine ? 'one-line' : '',
      hinting ? 'hinting' : '',
      (this.emptyDash || dashOnly) && empty ? 'empty' : '',
      this.redBelowZero && !hinting && notPositive(this.text) ? 'not-positive' : '',
    ].filter((mark) => mark !== '').join(' ')
    const frame = [
      'frame',
      this.bottom ? 'bottom' : '',
      this.sumRule ? 'sum-rule' : '',
      waiting === 'hide' ? 'away' : '',
    ].filter((mark) => mark !== '').join(' ')
    const text = html`<div
      class="text variant-${this.variant} align-${align} ${look}${withSymbol ? ' with-symbol' : ''}${marks === '' ? '' : ` ${marks}`}"
      style=${styleMap({ fontSize: hinting ? undefined : tokenOf(TEXT_SIZES[this.size]) })}
    >${withSymbol ? html`<span class="symbol">${symbolTpl(this.symbol)}</span>` : nothing}<span
        class="words"
        data-ff-editable
        data-ff-spot="text"
        ?data-ff-bound=${this.textField !== ''}
        @click=${this.reportSpot}
        @dblclick=${(e: MouseEvent) => {
          this.reportSpot(e)
          this.inlineEdit(e, 'text')
        }}
      >${words}</span></div>`
    if (!this.showLabel) return html`<div class=${frame}>${text}</div>`
    return html`<div class=${frame}><div class="with-label"><span
      class="label"
      style=${styleMap({ textAlign: align })}
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${this.label === '' && this.preview ? 'Beschriftung' : this.label}</span>${text}</div></div>`
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

// A text bound to several fields shows their values in a row, as a line of
// the data list does, the empty ones left out.
const link = makeDataLink<Text>({
  hydrate: (el) => {
    el.withoutRow = !hasRowToShow(el)
    const spot = readBoundSpot(el, TEXT_BINDING)
    if (spot.kind === 'unbound') return
    if (spot.kind !== 'value') {
      el.text = ''
      return
    }
    const binding = el.getAttribute(TEXT_BINDING) ?? ''
    el.text = bindingFields(binding).length > 1
      ? spotValue('', binding, spot.row, makeFieldReader(el))
      : spot.value
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
    bindable<typeof textProperties>([{ prop: 'text', name: 'Text', several: true, nameProp: 'label' }]),
  ],
  grid: { startWidth: 12, startHeight: 2, minWidth: 2, minHeight: 1, heightFromContent: true },
})
