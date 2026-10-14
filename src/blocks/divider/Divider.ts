import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { dividerStyle } from './dividerStyle'

// A line the builder lays on the sheet, the hairline of the mask and nothing
// to choose: Belegerfassung needs no other (user, 14.10.).
export class Divider extends BlockElement {
  static readonly type = 'divider'
  static readonly tag = 'ff-divider'

  static override styles: CSSResultGroup = [BlockElement.styles, dividerStyle]

  override render(): TemplateResult {
    return html`<div class="divider" role="separator"><div class="line"></div></div>`
  }
}

defineBlock(Divider, {
  name: 'Trennlinie',
  category: 'layout',
  grid: { startWidth: 48, startHeight: 1, minWidth: 2, minHeight: 1 },
})
