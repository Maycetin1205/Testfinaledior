import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { wireOpened } from '../../runtime/opening'
import { lookStyle, toneValue } from '../look/look'
import { areaStyle } from './areaStyle'
import { areaProperties, type AreaValues } from './properties'

export interface Area extends AreaValues {}

export class Area extends BlockElement {
  static readonly type = 'area'
  static readonly tag = 'ff-area'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, areaStyle]

  private unwire: (() => void) | null = null

  // In the mask an area that opens with another block starts closed.
  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.preview && this.unwire === null) this.unwire = wireOpened(this, this.openedBy)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unwire?.()
    this.unwire = null
  }

  // The head of a headed area carries the title, typed right there.
  override render(): TemplateResult {
    const headed = this.appearance === 'headed'
    return html`<div class="frame appearance-${this.appearance} tone-${toneValue(this.tone)}">
      ${headed
        ? html`<div class="head">
            <span
              class="head-text"
              data-ff-editable
              @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
            >${this.heading}</span>
          </div>`
        : nothing}
      <div class="body"><slot></slot></div>
    </div>`
  }
}

defineBlock(Area, {
  name: 'Bereich',
  category: 'layout',
  properties: areaProperties,
  takesChildren: true,
  gridArea: true,
  grid: { startWidth: 24, startHeight: 12, minWidth: 4, minHeight: 3 },
})
