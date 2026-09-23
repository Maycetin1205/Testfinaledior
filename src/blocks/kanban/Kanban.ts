import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { boardRegister, boardUnregister } from './board'
import { CARD_TYPE } from './places'
import { KanbanColumn } from './KanbanColumn'
import { kanbanStyle } from './kanbanStyle'
import { kanbanProperties, type KanbanValues } from './properties'

export interface Kanban extends KanbanValues {}

export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, kanbanStyle]

  @property({ attribute: false }) busy = false

  override render(): TemplateResult {
    return html`
      <div class="tafel">
        <slot></slot>
      </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    boardRegister(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    boardUnregister(this)
  }
}

defineBlock(Kanban, {
  name: 'Kanban',
  category: 'display',
  properties: kanbanProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'recordPick' },
    {
      kind: 'events',
      list: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ],
  takesChildren: true,
  allowedChildren: [CARD_TYPE, KanbanColumn.type],
  childDirection: 'row',
  fixedWidth: 'fill',
  childButton: { name: 'Spalte', childType: KanbanColumn.type },
  childDefaults: [
    { type: CARD_TYPE },
    { type: KanbanColumn.type, values: { heading: 'Offen', tone: 'warning' } },
    { type: KanbanColumn.type, values: { heading: 'In Arbeit', tone: 'info' } },
    { type: KanbanColumn.type, values: { heading: 'Fertig', tone: 'success' } },
  ],
  templateKind: { type: CARD_TYPE, name: 'Kartenmuster', direction: 'column' },
  grid: { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8 },
})
