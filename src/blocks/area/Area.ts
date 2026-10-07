import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { toneStyle, toneValue } from '../tone/tone'
import { areaStyle } from './areaStyle'
import { areaProperties, type AreaValues } from './properties'

export interface Area extends AreaValues {}

export class Area extends BlockElement {
  static readonly type = 'area'
  static readonly tag = 'ff-area'

  static override styles: CSSResultGroup = [BlockElement.styles, toneStyle, areaStyle]

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
