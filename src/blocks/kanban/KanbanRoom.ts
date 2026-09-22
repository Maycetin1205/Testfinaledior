import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { emptyState, emptyStyle } from '../behavior/emptyState'
import { ROOM_TAG, TARGET_CLASS, placeStyle } from './places'
import { roomStyle } from './roomStyle'
import { kanbanRoomProperties, type KanbanRoomValues } from './properties'

export interface KanbanRoom extends KanbanRoomValues {}

export class KanbanRoom extends BlockElement {
  static readonly type = 'kanban-room'
  static readonly tag = ROOM_TAG

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    placeStyle,
    roomStyle,
  ]

  @property({ attribute: false }) emptyHint = ''

  override render(): TemplateResult {
    return html`<div class="zimmer ${TARGET_CLASS}">
      <div
        class="kopf"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
      >${this.heading}</div>
      <div class="rumpf">
        <slot></slot>
        ${emptyState(this.emptyHint)}
      </div>
    </div>`
  }
}

defineBlock(KanbanRoom, {
  name: 'Unterteilung',
  category: 'display',
  properties: kanbanRoomProperties,
  takesChildren: true,
  allowedChildren: [],
  inPalette: false,
  containerFrame: false,
  allowedParent: ['kanban-column'],
  fixedWidth: 'fill',
  widthEditable: false,
})
