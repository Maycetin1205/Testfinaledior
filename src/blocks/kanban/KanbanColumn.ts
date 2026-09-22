import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { Direction, FlowWidth } from '../../core/block/flow'
import { booleanProperty, fieldProperty, textProperty } from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import { toneProperty, toneStyle, toneValue, type ToneValue } from '../behavior/tone'
import { emptyStyle, emptyState } from '../behavior/emptyState'
import {
  CARD_TAG,
  COLUMN_TAG,
  COLUMN_TITLE_STANDARD,
  boardAreasStyle,
  TARGET_CLASS,
  ROOM_CONTENT_EVENT,
} from '../behavior/cardBoard'
import { KanbanRoom } from './KanbanRoom'
import { kanbanColumnStyle } from './kanbanColumnStyle'

export class KanbanColumn extends BlockElement {
  static readonly type = 'kanban-column'
  static readonly tag = COLUMN_TAG
  static readonly displayName = 'Kanban-Spalte'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = []

  static readonly takesChildren = true
  static readonly allowedChildren = [KanbanRoom.type]

  static readonly childButton = {
    name: 'Unterteilung',
    childType: KanbanRoom.type,

    nameFromField: 'groupingField',
  }

  static readonly childDirection: Direction = 'column'
  static readonly inPalette = false
  static readonly containerFrame = false

  static readonly allowedParent = ['kanban']
  static readonly fixedWidth: FlowWidth = 'fill'
  static readonly widthEditable = false

  static readonly blockProperties = {
    tone: toneProperty(
      'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
    ),
    heading: textProperty({
      default: COLUMN_TITLE_STANDARD,
      label: 'Titel',
      help: 'Die Überschrift der Spalte.',
      place: 'block',
      attribute: 'heading',
    }),
    value: textProperty({
      default: '',
      label: 'Wert im ERP',
      help: 'Steht im Statusfeld, wenn eine Karte hier liegt. Leer: der Titel.',
      attribute: 'value',
    }),
    catchAll: booleanProperty({
      default: false,
      label: 'Auffangspalte',
      help: 'Einträge ohne passenden Wert landen hier.',
      attribute: 'catchall',
      needsSource: true,
      onlyUnderSiblings: true,
    }),
    groupingField: fieldProperty({
      default: '',
      label: 'Unterteilen nach',
      help: 'Wähle das Datenfeld, nach dem die Spalte unterteilt wird, z. B. Mitarbeiter oder Raum. Die Unterteilungen heißen danach wie dieses Feld. Trage an jeder den passenden ERP-Wert ein; unbekannte Werte landen in der ersten.',
      attribute: 'groupingfield',
    }),
  }

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    boardAreasStyle,
    toneStyle,
    kanbanColumnStyle,
  ]

  tone: ToneValue = 'info'
  heading = COLUMN_TITLE_STANDARD
  value = ''
  catchAll = false
  groupingField = ''

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

BlockElement.defineAndRegister(KanbanColumn)
