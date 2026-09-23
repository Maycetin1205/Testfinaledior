import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { areaStyle } from './areaStyle'

export class Area extends BlockElement {
  static readonly type = 'area'
  static readonly tag = 'ff-area'

  static override styles: CSSResultGroup = [BlockElement.styles, areaStyle]

  override render(): TemplateResult {
    return html`<div class="rumpf"><slot></slot></div>`
  }
}

defineBlock(Area, {
  name: 'Bereich',
  category: 'layout',
  takesChildren: true,
  gridArea: true,
  containerFrame: false,
  grid: { startWidth: 24, startHeight: 12, minWidth: 4, minHeight: 3 },
})
