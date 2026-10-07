import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock, sendPropChange } from '../base/BlockElement'
import { startRename } from '../base/inlineRename'
import { bindable } from '../../core/block/capability'
import { toneStyle, toneValue } from '../tone/tone'
import type { DataPreamble } from '../../runtime/source'
import { animalOf, animalOutline } from './animal'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { KANBAN_COLUMNS_BINDING, kanbanColumnsFrom, type KanbanPlace } from './columns'
import type { Spot } from './places'
import { kanbanStyle } from './kanbanStyle'
import { AVATAR_SPOT, CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const COUNT_IN_EDITOR = '—'

export interface Kanban extends KanbanValues {}

// One block draws the columns, their places and the cards. In the editor every
// place holds the card as the mask draws it; its spots are typed or bound right
// there.
export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, toneStyle, kanbanStyle]

  readonly board = new Board(this)

  // A bound spot shows its field, any other what the builder typed.
  cardValues(row: unknown, read: DataPreamble['read']): Record<string, string> {
    const typedOrBound = Object.fromEntries(CARD_SPOTS.map(({ prop }) => {
      const field = this[`${prop}Field`]
      return [prop, field === '' ? this[prop] : read(row, field)]
    }))
    return { ...typedOrBound, avatar: this.avatarField === '' ? '' : read(row, this.avatarField) }
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

  // The avatar shows its field: the outline of the animal it names, in the
  // color of that kind, or the picture at the address it holds; a picture that
  // does not load leaves the avatar empty. In the editor a bound avatar shows
  // the outline the mask draws for an animal it does not know; a picture only
  // the mask has.
  private avatar(values: Readonly<Record<string, string>> | null): TemplateResult {
    const image = this.avatarKind === 'image'
    if (values !== null) {
      if (image) return html`<span class="avatar" style=${`background-image:url(${JSON.stringify(values.avatar)})`}></span>`
      const animal = animalOf(values.avatar)
      return html`<span class="avatar" style="color:var(--se-animal-${animal})">${animalOutline(animal)}</span>`
    }
    const bound = this.avatarField !== ''
    return html`<span
      class="avatar"
      data-ff-spot=${AVATAR_SPOT.prop}
      ?data-ff-bound=${bound}
    >${bound && !image ? animalOutline('paw') : nothing}</span>`
  }

  // The button under the cards of a column, in the tone of the column it leads
  // to; the last column has none. In the editor its text is typed on it; in
  // the mask it shows only with a text and moves the card on.
  private advance(column: number, card: CardData | null): TemplateResult | typeof nothing {
    const columns = kanbanColumnsFrom(this.columns)
    const next = columns[column + 1]
    const text = columns[column]?.button ?? ''
    if (!next || (card !== null && text.trim() === '')) return nothing
    if (card === null) {
      return html`<button
        type="button"
        class="advance tone-${toneValue(next.tone)}"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.editAdvance(e, column)}
      >${text}</button>`
    }
    return html`<button
      type="button"
      class="advance tone-${toneValue(next.tone)}"
      draggable="false"
      @click=${(e: MouseEvent) => {
        e.stopPropagation()
        this.board.advance(card)
      }}
    >${text}</button>`
  }

  private editAdvance(event: MouseEvent, column: number): void {
    if (!this.editable) return
    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (text, original) => {
      if (text === original) return
      const columns = kanbanColumnsFrom(this.columns).map((c, i) => (i === column ? { ...c, button: text } : c))
      sendPropChange(this, 'columns', columns)
    })
  }

  // The card as .vkarte of the reception mask: avatar, beside it the title
  // with the subline on the same line and the second title below, the time at
  // the right; then the chip, the text, the date, the button. Without values
  // the card is the one the builder shapes: every spot shows. In the mask a
  // spot without a value falls away.
  private cardContent(column: number, card: CardData | null): TemplateResult {
    const values = card === null ? null : card.values
    const shows = (prop: CardSpot | typeof AVATAR_SPOT.prop): boolean =>
      values === null || (values[prop] ?? '').trim() !== ''
    const line = shows('heading') || shows('subline')
    const main = shows('avatar') || line || shows('heading2') || shows('time')
    return html`
      ${main
        ? html`<div class="main">
            ${shows('avatar') ? this.avatar(values) : nothing}
            <div class="ident">
              ${line
                ? html`<div class="line">
                    ${shows('heading') ? this.spot('heading', 'name', values) : nothing}
                    ${shows('subline') ? this.spot('subline', 'meta', values) : nothing}
                  </div>`
                : nothing}
              ${shows('heading2') ? this.spot('heading2', 'owner', values) : nothing}
            </div>
            ${shows('time') ? this.spot('time', 'time', values) : nothing}
          </div>`
        : nothing}
      ${shows('chip')
        ? html`<div class="flags">${this.spot('chip', `chip tone-${toneValue(this.chipTone)}`, values)}</div>`
        : nothing}
      ${shows('text') ? this.spot('text', 'text', values) : nothing}
      ${shows('date') ? this.spot('date', 'date', values) : nothing}
      ${this.advance(column, card)}`
  }

  private cardTpl(card: CardData, column: number): TemplateResult {
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
    >${this.cardContent(column, card)}</div>`
  }

  private cardsAt(spot: Spot): TemplateResult | TemplateResult[] {
    if (this.preview) return html`<div class="card">${this.cardContent(spot.column, null)}</div>`
    return this.board.cardsAt(spot).map((card) => this.cardTpl(card, spot.column))
  }

  private count(cards: readonly CardData[]): string | number {
    return this.preview ? COUNT_IN_EDITOR : cards.length
  }

  // A place of a column with more than one, as a box with its name on top.
  private placeTpl(spot: Spot, place: KanbanPlace): TemplateResult {
    const board = this.board
    return html`<div
      class="place${board.isTarget(spot) ? ' target' : ''}"
      @dragover=${(e: DragEvent) => board.over(e, spot)}
      @drop=${(e: DragEvent) => board.drop(e, spot)}
    >
      <div class="place-head" data-ff-entry="${spot.column}.${spot.place}">
        <span class="head-text">${place.name}</span>
        <span class="place-count">${this.count(board.cardsAt(spot))}</span>
      </div>
      <div class="place-body">${this.cardsAt(spot)}</div>
    </div>`
  }

  override render(): TemplateResult {
    const board = this.board
    return html`<div class="board" aria-busy=${String(board.writes)} @dragleave=${(e: DragEvent) => board.leave(e)}>
      ${kanbanColumnsFrom(this.columns).map((column, i) => {
        const only: Spot = { column: i, place: 0 }
        const single = column.places.length === 1
        return html`<div
          class="column tone-${toneValue(column.tone)}${single && board.isTarget(only) ? ' target' : ''}"
          @dragover=${single ? (e: DragEvent) => board.over(e, only) : nothing}
          @drop=${single ? (e: DragEvent) => board.drop(e, only) : nothing}
        >
          <div class="head" data-ff-entry=${i}>
            <span class="dot"></span>
            <span class="head-text">${column.heading}</span>
            <span class="count">${this.count(board.cardsIn(i))}</span>
          </div>
          <div class="body">
            ${single
              ? this.cardsAt(only)
              : column.places.map((place, p) => this.placeTpl({ column: i, place: p }, place))}
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
    bindable<typeof kanbanProperties>([...CARD_SPOTS, AVATAR_SPOT]),
    {
      kind: 'events',
      list: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ],
  grid: { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8, grows: true },
})
