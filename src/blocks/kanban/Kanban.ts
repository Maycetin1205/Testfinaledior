import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { emptyState, emptyStyle } from '../behavior/emptyState'
import { boardMoveTo, boardRegister, boardUnregister } from './board'
import { CARD_TYPE, type BoardTarget } from './places'
import { KanbanColumn } from './KanbanColumn'
import { kanbanStyle } from './kanbanStyle'
import { kanbanProperties, type KanbanValues } from './properties'

export interface Kanban extends KanbanValues {}

export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, emptyStyle, kanbanStyle]

  @property({ attribute: false }) moveMessage = ''
  @property({ attribute: false }) readMessage = ''
  @property({ attribute: false }) boardHint = ''
  @property({ attribute: false }) busy = false
  @property({ attribute: false }) selectionTitle = ''
  @property({ attribute: false }) currentTarget = ''
  @property({ attribute: false }) targets: BoardTarget[] = []

  private targetChosen(event: Event): void {
    const field = event.currentTarget as HTMLSelectElement
    const target = field.value
    field.value = this.currentTarget
    boardMoveTo(this, target)
  }

  override render(): TemplateResult {
    return html`
      <p class="meldung" role="status" aria-live="polite">${this.moveMessage}</p>
      <p class="meldung">${this.readMessage}</p>
      ${this.selectionTitle ? html`<label class="bedienung">
        <span>${this.selectionTitle} verschieben nach</span>
        <select aria-label="Ziel für die gewählte Karte" .value=${this.currentTarget}
          ?disabled=${this.busy}
          @change=${this.targetChosen}>
          ${this.targets.map((target) => html`<option value=${target.id} ?selected=${target.id === this.currentTarget}>${target.name}</option>`)}
        </select>
      </label>` : ''}
      <div class="tafel">
        <slot></slot>
        ${emptyState(this.boardHint, true)}
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
  widthEditable: false,
  heightEditable: true,
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
