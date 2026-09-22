import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { emptyStyle, emptyState } from '../behavior/emptyState'
import {
  boardAreasStyle,
  TARGET_CLASS,
  ROOM_CONTENT_EVENT,
  ROOM_TAG,
} from '../behavior/cardBoard'
import { kanbanRoomStyle } from './kanbanRoomStyle'
import { kanbanRoomProperties, type KanbanRoomValues } from './roomProperties'

export interface KanbanRoom extends KanbanRoomValues {}

export class KanbanRoom extends BlockElement {
  static readonly type = 'kanban-room'
  static readonly tag = ROOM_TAG

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    boardAreasStyle,
    kanbanRoomStyle,
  ]

  @property({ attribute: false }) emptyHint = ''

  private contentSwitched(): void {
    this.dispatchEvent(new CustomEvent(ROOM_CONTENT_EVENT, {
      bubbles: true,
      composed: true,
    }))
  }

  override render(): TemplateResult {
    return html`<div class="zimmer ${TARGET_CLASS}">
      <div
        class="kopf"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
      >${this.heading}</div>
      <div class="rumpf">
        <slot @slotchange=${this.contentSwitched}></slot>
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
