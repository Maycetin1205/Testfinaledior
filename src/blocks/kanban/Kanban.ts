import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { ChildDefault } from '../../core/block/blockType'
import type { Capability } from '../../core/block/capability'
import type { Direction, FlowWidth } from '../../core/block/flow'
import { fieldProperty, sourceProperty } from '../../core/block/property'
import { emptyTextProperty } from '../behavior/emptyState'
import { dayFieldProperty } from '../behavior/source'
import {
  CARD_TYPE,
  boardUnregister,
  boardRegister,
  MOVE_EVENT,
  type BoardTarget,
} from '../behavior/cardBoard'
import { KanbanColumn } from './KanbanColumn'
import { kanbanStyle } from './kanbanStyle'

export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'
  static readonly displayName = 'Kanban'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = [
    { kind: 'source' },
    { kind: 'recordPick' },
    {
      kind: 'events',
      list: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ]

  static readonly takesChildren = true
  static readonly allowedChildren = [CARD_TYPE, KanbanColumn.type]
  static readonly childDirection: Direction = 'row'

  static readonly fixedWidth: FlowWidth = 'fill'
  static readonly widthEditable = false
  static readonly heightEditable = true
  static readonly childButton = { name: 'Spalte', childType: KanbanColumn.type }

  static readonly templateKind = { type: CARD_TYPE, name: 'Kartenmuster', direction: 'column' as const }

  static readonly grid = { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8 }

  static readonly blockProperties = {
    source: sourceProperty({
      default: '',
      label: 'Datenquelle',
      help: 'Die Quelle, deren Zeilen als Karten liegen.',
      place: 'none',
      attribute: 'source',
    }),
    columnsField: fieldProperty({
      default: '',
      label: 'Einsortieren nach',
      help: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffang-Spalte.',
      attribute: 'columnsfield',
    }),
    dayField: dayFieldProperty(),
    emptyText: emptyTextProperty(),
  }

  static readonly childDefaults: ChildDefault[] = [
    { type: CARD_TYPE },
    { type: KanbanColumn.type, values: { title: 'Offen', tone: 'warning' } },
    { type: KanbanColumn.type, values: { title: 'In Arbeit', tone: 'info' } },
    { type: KanbanColumn.type, values: { title: 'Fertig', tone: 'success' } },
  ]

  static override styles: CSSResultGroup = [BlockElement.styles, kanbanStyle]

  @property({ attribute: false }) message = ''
  @property({ attribute: false }) busy = false
  @property({ attribute: false }) selectionTitle = ''
  @property({ attribute: false }) currentTarget = ''
  @property({ attribute: false }) targets: BoardTarget[] = []

  private targetChosen(ereignis: Event): void {
    const field = ereignis.currentTarget as HTMLSelectElement
    const target = field.value
    field.value = this.currentTarget
    this.dispatchEvent(new CustomEvent(MOVE_EVENT, { detail: target }))
  }

  override render(): TemplateResult {
    return html`
      <p class="meldung" role="status" aria-live="polite">${this.message}</p>
      ${this.selectionTitle ? html`<label class="bedienung">
        <span>${this.selectionTitle} verschieben nach</span>
        <select aria-label="Ziel für die gewählte Karte" .value=${this.currentTarget}
          ?disabled=${this.busy}
          @change=${this.targetChosen}>
          ${this.targets.map((target) => html`<option value=${target.id} ?selected=${target.id === this.currentTarget}>${target.name}</option>`)}
        </select>
      </label>` : ''}
      <div class="tafel"><slot></slot></div>`
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

BlockElement.defineAndRegister(Kanban)
