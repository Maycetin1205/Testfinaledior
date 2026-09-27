import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import { toneStyle, toneValue } from '../tone/tone'
import type { DataPreamble } from '../../runtime/source'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { KANBAN_COLUMNS_BINDING, kanbanColumnsFrom } from './columns'
import { kanbanStyle } from './kanbanStyle'
import { CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const COUNT_IN_EDITOR = '—'

export interface Kanban extends KanbanValues {}

// One block draws the columns and the cards. In the editor every column holds
// the card as the mask draws it; its spots are typed or bound right there.
export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, toneStyle, kanbanStyle]

  readonly board = new Board(this)

  // A bound spot shows its field, any other what the builder typed.
  cardValues(row: unknown, read: DataPreamble['read']): Record<string, string> {
    return Object.fromEntries(CARD_SPOTS.map(({ prop }) => {
      const field = this[`${prop}Field`]
      return [prop, field === '' ? this[prop] : read(row, field)]
    }))
  }

  private spot(prop: CardSpot, className: string, values: Readonly<Record<string, string>> | null): TemplateResult {
    if (values !== null) return html`<span class=${className}>${values[prop]}</span>`
    return html`<span
      class=${className}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field`] !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  // Without values the card is the one the builder shapes: every spot shows.
  // In the mask a spot without a value falls away.
  private cardContent(values: Readonly<Record<string, string>> | null): TemplateResult {
    const shows = (prop: CardSpot): boolean => values === null || (values[prop] ?? '').trim() !== ''
    const foot = shows('heading2') || shows('date') || shows('time') || shows('chip')
    return html`
      ${shows('heading') ? this.spot('heading', 'name', values) : nothing}
      ${shows('subline') ? this.spot('subline', 'extra', values) : nothing}
      ${shows('text') ? this.spot('text', 'text', values) : nothing}
      ${foot
        ? html`<div class="foot">
            ${shows('heading2') ? this.spot('heading2', 'foot-title', values) : nothing}
            ${shows('date') ? this.spot('date', 'date', values) : nothing}
            ${shows('time') ? this.spot('time', 'time', values) : nothing}
            ${shows('chip') ? this.spot('chip', `chip tone-${toneValue(this.chipTone)}`, values) : nothing}
          </div>`
        : nothing}`
  }

  private cardTpl(card: CardData): TemplateResult {
    const board = this.board
    const chosen = card.key === board.chosen
    return html`<div
      class="card${chosen ? ' chosen' : ''}${card.key === board.dragging ? ' dragging' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${String(chosen)}
      draggable=${board.writes ? 'false' : 'true'}
      @click=${() => board.choose(card)}
      @keydown=${(e: KeyboardEvent) => {
        if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== e.currentTarget) return
        e.preventDefault()
        board.choose(card)
      }}
      @dragstart=${(e: DragEvent) => board.startDrag(e, card)}
      @dragend=${() => board.endDrag()}
    >${this.cardContent(card.values)}</div>`
  }

  override render(): TemplateResult {
    const board = this.board
    return html`<div class="board" aria-busy=${String(board.writes)} @dragleave=${(e: DragEvent) => board.leave(e)}>
      ${kanbanColumnsFrom(this.columns).map((column, i) => {
        const cards = this.preview ? [] : board.cardsIn(i)
        return html`<div
          class="column tone-${toneValue(column.tone)}${board.target === i ? ' target' : ''}"
          @dragover=${(e: DragEvent) => board.over(e, i)}
          @drop=${(e: DragEvent) => board.drop(e, i)}
        >
          <div class="head" data-ff-entry=${i}>
            <span class="dot"></span>
            <span class="head-text">${column.heading}</span>
            <span class="count">${this.preview ? COUNT_IN_EDITOR : cards.length}</span>
          </div>
          <div class="body">
            ${this.preview
              ? html`<div class="card">${this.cardContent(null)}</div>`
              : cards.map((card) => this.cardTpl(card))}
          </div>
        </div>`
      })}
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
    { kind: 'list', binding: KANBAN_COLUMNS_BINDING },
    bindable<typeof kanbanProperties>(CARD_SPOTS),
    {
      kind: 'events',
      list: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ],
  fixedWidth: 'fill',
  grid: { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8 },
})
