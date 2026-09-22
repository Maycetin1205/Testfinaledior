import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { FlowWidth } from '../../core/block/flow'
import { textProperty } from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import { emptyStyle, emptyState } from '../behavior/emptyState'
import {
  boardAreasStyle,
  TARGET_CLASS,
  ROOM_CONTENT_EVENT,
  ROOM_TAG,
  ROOM_TITLE_STANDARD,
} from '../behavior/cardBoard'
import { kanbanRoomStyle } from './kanbanRoomStyle'

export class KanbanRoom extends BlockElement {
  static readonly type = 'kanban-zimmer'
  static readonly tag = ROOM_TAG
  static readonly displayName = 'Unterteilung'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = []

  static readonly takesChildren = true
  static readonly allowedChildren: readonly string[] = []
  static readonly inPalette = false
  static readonly containerFrame = false

  static readonly allowedParent = ['kanban-column']

  static readonly fixedWidth: FlowWidth = 'fill'
  static readonly widthEditable = false

  static readonly blockProperties = {
    heading: textProperty({
      default: ROOM_TITLE_STANDARD,
      label: 'Titel',
      help: 'Die Überschrift der Unterteilung.',
      place: 'block',
      attribute: 'heading',
    }),
    value: textProperty({
      default: '',
      label: 'Wert im ERP',
      help: 'Steht im Feld der Unterteilung, wenn eine Karte hier liegt. Leer: der Titel.',
      attribute: 'value',
    }),
  }

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    boardAreasStyle,
    kanbanRoomStyle,
  ]

  heading = ROOM_TITLE_STANDARD
  value = ''

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

BlockElement.defineAndRegister(KanbanRoom)
