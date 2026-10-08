import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock, sendPropChange } from '../base/BlockElement'
import { startRename } from '../base/inlineRename'
import { reportsHeads } from '../base/headsReport'
import { bindable } from '../../core/block/capability'
import { lookStyle, toneValue } from '../look/look'
import { spotValue, type DataPreamble } from '../../runtime/source'
import { animalAvatarTpl, avatarSpotTpl, imageAvatarTpl } from '../parts/card'
import { chipClass, chipStyle } from '../parts/chip'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { cardsByClock, SAMPLE_HOUR_LINE, SAMPLE_UNTIL, type Until } from './clock'
import { KANBAN_COLUMNS_BINDING, type KanbanPlace } from './columns'
import type { Spot } from './places'
import { kanbanStyle } from './kanbanStyle'
import { AVATAR_SPOT, CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const COUNT_IN_EDITOR = '—'
const CLOCK_TICK = 30_000

export interface Kanban extends KanbanValues {}

// One block draws the columns, their places and the cards. In the editor every
// place holds the card as the mask draws it; its spots are typed or bound right
// there.
export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, kanbanStyle, chipStyle]

  readonly board = new Board(this)

  private clock: ReturnType<typeof setInterval> | null = null

  constructor() {
    super()
    reportsHeads(this)
  }

  cardValues(row: unknown, read: DataPreamble['read']): Record<string, string> {
    const typedOrBound = Object.fromEntries(CARD_SPOTS.map(({ prop }) =>
      [prop, spotValue(this[prop], this[`${prop}Field`], row, read)]))
    return { ...typedOrBound, avatar: this.avatarField === '' ? '' : read(row, this.avatarField) }
  }

  private spot(prop: CardSpot, className: string, values: Readonly<Record<string, string>> | null): TemplateResult {
    if (values !== null) return html`<span class=${className}>${values[prop]}</span>`
    return html`<span
      class=${className}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field`] !== ''}
      @click=${this.reportSpot}
      @dblclick=${(e: MouseEvent) => {
        this.reportSpot(e)
        this.inlineEdit(e, prop)
      }}
    >${this[prop]}</span>`
  }

  // The avatar shows its field: the outline of the animal it names, in the
  // color of that kind, or the picture at the address it holds; a picture that
  // does not load leaves the avatar empty. In the editor a bound avatar shows
  // the outline the mask draws for an animal it does not know; a picture only
  // the mask has.
  private avatar(values: Readonly<Record<string, string>> | null): TemplateResult {
    const image = this.avatarKind === 'image'
    if (values !== null) return image ? imageAvatarTpl(values.avatar) : animalAvatarTpl(values.avatar)
    const bound = this.avatarField !== ''
    return avatarSpotTpl(AVATAR_SPOT.prop, bound, bound && !image, (e) => this.reportSpot(e))
  }

  // The button under the cards of a column, as the column sets it: on to the
  // next column, in the tone of that one, the last column has none; or the
  // board's action, in the accent. In the editor its text is typed on it; in
  // the mask it shows only with a text.
  private button(column: number, card: CardData | null): TemplateResult | typeof nothing {
    const columns = this.columns
    const own = columns[column]
    const next = columns[column + 1]
    if (!own || own.buttonKind === 'none' || (own.buttonKind === 'next' && !next)) return nothing
    if (card !== null && own.button.trim() === '') return nothing
    const look = own.buttonKind === 'next' && next ? `tone-${toneValue(next.tone)}` : 'action'
    if (card === null) {
      return html`<button
        type="button"
        class="advance ${look}"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.editButton(e, column)}
      >${own.button}</button>`
    }
    return html`<button
      type="button"
      class="advance ${look}"
      draggable="false"
      @click=${(e: MouseEvent) => {
        e.stopPropagation()
        if (own.buttonKind === 'next') this.board.advance(card)
        else this.board.press(card)
      }}
    >${own.button}</button>`
  }

  private editButton(event: MouseEvent, column: number): void {
    if (!this.editable) return
    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (text, original) => {
      if (text === original) return
      const columns = this.columns.map((c, i) => (i === column ? { ...c, button: text } : c))
      sendPropChange(this, 'columns', columns)
    })
  }

  // A spot the builder gave something: a text typed on it or a field.
  private spotShaped(prop: CardSpot | typeof AVATAR_SPOT.prop): boolean {
    if (prop === AVATAR_SPOT.prop) return this.avatarField !== ''
    return this[prop] !== '' || this[`${prop}Field`] !== ''
  }

  // The card as .vkarte of the reception mask: avatar, beside it the title
  // with the subline on the same line and the second title below, the time at
  // the right; then the chip, the text, the date, how far its time lies from
  // now, the button. Without values the card is the one the builder shapes:
  // while the board is marked every spot shows, otherwise only the shaped
  // ones, and with none shaped every spot, so the card never stands empty.
  // In the mask a spot without a value falls away.
  private cardContent(column: number, card: CardData | null, until: Until | null): TemplateResult {
    const values = card === null ? null : card.values
    const onlyShaped = values === null && !this.editable
      && (this.spotShaped(AVATAR_SPOT.prop) || CARD_SPOTS.some((s) => this.spotShaped(s.prop)))
    const shows = (prop: CardSpot | typeof AVATAR_SPOT.prop): boolean => (values === null
      ? !onlyShaped || this.spotShaped(prop)
      : (values[prop] ?? '').trim() !== '')
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
        ? html`<div class="flags">${this.spot('chip', chipClass(this.chipTone, this.chipEmphasis), values)}</div>`
        : nothing}
      ${shows('text') ? this.spot('text', 'text', values) : nothing}
      ${shows('date') ? this.spot('date', 'date', values) : nothing}
      ${until ? html`<span class="until${until.late ? ' late' : ''}">${until.text}</span>` : nothing}
      ${this.button(column, card)}`
  }

  private cardTpl(card: CardData, column: number, until: Until | null): TemplateResult {
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
    >${this.cardContent(column, card, until)}</div>`
  }

  // The cards of a place; a column by the clock orders them by their time.
  private cardsAt(spot: Spot): TemplateResult | TemplateResult[] {
    const byTime = this.columns[spot.column]?.byTime === true
    if (this.preview) {
      // One sample card per column, in its first place: the button of the
      // column is typed on it. The other places stand empty, as in the mask.
      if (spot.place !== 0) return []
      return html`${byTime ? SAMPLE_HOUR_LINE : nothing}<div class="card">${
        this.cardContent(spot.column, null, byTime ? SAMPLE_UNTIL : null)
      }</div>`
    }
    const cards = this.board.cardsAt(spot)
    if (!byTime) return cards.map((card) => this.cardTpl(card, spot.column, null))
    return cardsByClock(cards, (card, until) => this.cardTpl(card, spot.column, until))
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
      ${this.columns.map((column, i) => {
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

  // A column by the clock is drawn anew every half minute, but not while a
  // card is dragged.
  override connectedCallback(): void {
    super.connectedCallback()
    boardRegister(this)
    if (this.preview || this.clock !== null) return
    this.clock = setInterval(() => {
      if (this.board.dragging !== '' || !this.columns.some((c) => c.byTime)) return
      this.requestUpdate()
    }, CLOCK_TICK)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    boardUnregister(this)
    if (this.clock !== null) clearInterval(this.clock)
    this.clock = null
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
        { key: 'onCardButton', name: 'Knopf angeklickt' },
      ],
    },
  ],
  grid: { startWidth: 48, startHeight: 20, minWidth: 12, minHeight: 8, grows: true },
})
