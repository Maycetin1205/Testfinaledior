import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { toneStyle, toneValue } from '../tone/tone'
import { COLUMN_TAG, TARGET_CLASS, placeStyle } from './places'
import { columnStyle } from './columnStyle'
import { kanbanColumnProperties, type KanbanColumnValues } from './properties'

export interface KanbanColumn extends KanbanColumnValues {}

export class KanbanColumn extends BlockElement {
  static readonly type = 'kanban-column'
  static readonly tag = COLUMN_TAG

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    placeStyle,
    toneStyle,
    columnStyle,
  ]

  @property({ attribute: false }) cardCount = 0

  override render(): TemplateResult {
    return html`<div class="column tone-${toneValue(this.tone)}">
      <div class="head">
        <span class="dot"></span>
        <span
          class="title"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
        >${this.heading}</span>
        <span class="count">${this.cardCount}</span>
      </div>
      <div class="body ${TARGET_CLASS}">
        <slot></slot>
      </div>
    </div>`
  }
}

defineBlock(KanbanColumn, {
  name: 'Kanban-Spalte',
  head: '.head',
  category: 'display',
  properties: kanbanColumnProperties,

  // No block of its own may lie in a column; the board's card template is drawn here.
  takesChildren: true,
  allowedChildren: [],
  childDirection: 'column',
  inPalette: false,
  containerFrame: false,
  allowedParent: ['kanban'],
  fixedWidth: 'fill',
})
