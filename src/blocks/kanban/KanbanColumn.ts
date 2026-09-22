import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { toneStyle, toneValue } from '../behavior/tone'
import { emptyStyle, emptyState } from '../behavior/emptyState'
import {
  CARD_TAG,
  COLUMN_TAG,
  boardAreasStyle,
  TARGET_CLASS,
  ROOM_CONTENT_EVENT,
} from '../behavior/cardBoard'
import { KanbanRoom } from './KanbanRoom'
import { kanbanColumnStyle } from './kanbanColumnStyle'
import { kanbanColumnProperties, type KanbanColumnValues } from './columnProperties'

export interface KanbanColumn extends KanbanColumnValues {}

export class KanbanColumn extends BlockElement {
  static readonly type = 'kanban-column'
  static readonly tag = COLUMN_TAG

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    boardAreasStyle,
    toneStyle,
    kanbanColumnStyle,
  ]

  @property({ attribute: false }) emptyHint = ''

  @state() private _count = 0

  constructor() {
    super()

    this.addEventListener(ROOM_CONTENT_EVENT, () => this.count())
  }

  private count(): void {
    this._count = Array.from(this.querySelectorAll(CARD_TAG))
      .filter((el) => !el.hasAttribute('data-ff-editor'))
      .length
  }

  override render(): TemplateResult {
    return html`<div class="spalte ${TARGET_CLASS} v-${toneValue(this.tone)}">
      <div class="kopf">
        <span class="punkt"></span>
        <span
          class="titel"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
        >${this.heading}</span>
        <span class="anzahl">${this._count}</span>
      </div>
      <div class="rumpf">
        <slot @slotchange=${this.count}></slot>
        ${emptyState(this.emptyHint)}
      </div>
    </div>`
  }
}

defineBlock(KanbanColumn, {
  name: 'Kanban-Spalte',
  category: 'display',
  properties: kanbanColumnProperties,
  takesChildren: true,
  allowedChildren: [KanbanRoom.type],
  childButton: {
    name: 'Unterteilung',
    childType: KanbanRoom.type,
    nameFromField: 'groupingField',
  },
  childDirection: 'column',
  inPalette: false,
  containerFrame: false,
  allowedParent: ['kanban'],
  fixedWidth: 'fill',
  widthEditable: false,
})
