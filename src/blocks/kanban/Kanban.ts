import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { BlockElement, defineBlock, sendPropChange } from '../base/BlockElement'
import { startRename } from '../base/inlineRename'
import { reportsHeads } from '../base/headsReport'
import { bindable } from '../../core/block/capability'
import { lookStyle, toneValue } from '../look/look'
import { readSamples, sampleValue, spotValue, type DataPreamble } from '../../runtime/source'
import { animalAvatarTpl, avatarStyle } from '../parts/card'
import { Board, boardRegister, boardUnregister, type CardData } from './board'
import { cardsByClock, SAMPLE_HOUR_LINE, SAMPLE_UNTIL, type Until } from './clock'
import { KANBAN_COLUMNS_BINDING, type KanbanPlace } from './columns'
import { spotOf, type Spot } from './places'
import { kanbanStyle } from './kanbanStyle'
import { CARD_SPOTS, kanbanProperties, type CardSpot, type KanbanValues } from './properties'

const COUNT_IN_EDITOR = '—'
const CLOCK_TICK = 30_000

export interface Kanban extends KanbanValues {}

// One block draws the columns, their places and the cards. In the editor every
// place holds the card as the mask draws it; its spots are bound right there.
export class Kanban extends BlockElement {
  static readonly type = 'kanban'
  static readonly tag = 'ff-kanban'

  static override styles: CSSResultGroup = [BlockElement.styles, lookStyle, avatarStyle, kanbanStyle]

  readonly board = new Board(this)

  private clock: ReturnType<typeof setInterval> | null = null

  constructor() {
    super()
    reportsHeads(this)
  }

  cardValues(row: unknown, read: DataPreamble['read']): Record<string, string> {
    const bound = Object.fromEntries(CARD_SPOTS.map(({ prop }) =>
      [prop, spotValue('', this[`${prop}Field`], row, read)]))
    return { ...bound, avatar: this.avatarField === '' ? '' : read(row, this.avatarField) }
  }

  // In the editor a spot shows the sample of its column where it has one,
  // else what the editor gives it; a spot without a field stands empty.
  private spot(
    prop: CardSpot,
    className: string,
    values: Readonly<Record<string, string>> | null,
    sample: Readonly<Record<string, string>> | null,
  ): TemplateResult {
    if (values !== null) return html`<span class=${className}>${values[prop]}</span>`
    const sampled = sample?.[prop] ?? ''
    return html`<span
      class=${className}
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field`] !== ''}
      @click=${this.reportSpot}
      @dblclick=${this.reportSpot}
    >${sampled.trim() !== '' ? sampled : this.spotTexts[prop] ?? ''}</span>`
  }

  // The avatar shows the outline of the animal its field names, in the color
  // of that kind. In the editor it shows the animal of the samples, else
  // nothing.
  private avatar(values: Readonly<Record<string, string>> | null, sample: Readonly<Record<string, string>> | null): TemplateResult | typeof nothing {
    if (values !== null) return animalAvatarTpl(values.avatar)
    const species = sample?.avatar || sampleValue(this, this.avatarField)
    return species === '' ? nothing : animalAvatarTpl(species)
  }

  // The button under the cards of a column, as the column sets it: on to the
  // next column, the last column has none; or the board's action. Both look
  // the same. In the editor its text is typed on it; in the mask it shows
  // only with a text.
  private button(column: number, card: CardData | null): TemplateResult | typeof nothing {
    const columns = this.columns
    const own = columns[column]
    const next = columns[column + 1]
    if (!own || own.buttonKind === 'none' || (own.buttonKind === 'next' && !next)) return nothing
    if (card !== null && own.button.trim() === '') return nothing
    if (card === null) {
      return html`<button
        type="button"
        class="advance"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.editButton(e, column)}
      >${own.button}</button>`
    }
    return html`<button
      type="button"
      class="advance"
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

  private spotBound(prop: CardSpot): boolean {
    return this[`${prop}Field`] !== ''
  }

  // Whether a spot of the card shows. Without values the card is the one the
  // builder shapes: while the board is marked every spot shows, otherwise
  // only the bound ones, and with none bound every spot, so the card never
  // stands empty. The avatar shows only with its field. In the mask a spot
  // without a value falls away.
  private shows(values: Readonly<Record<string, string>> | null, prop: CardSpot | 'avatar'): boolean {
    if (values !== null) return (values[prop] ?? '').trim() !== ''
    if (prop === 'avatar') return this.avatarField !== ''
    const onlyBound = !this.editable && CARD_SPOTS.some((s) => this.spotBound(s.prop))
    return !onlyBound || this.spotBound(prop)
  }

  // The card as .vkarte of the reception mask: avatar, beside it the title
  // with the subline on the same line and the second title below, the time at
  // the right; then the text, the date, how far its time lies from now, the
  // button.
  private cardContent(
    column: number,
    card: CardData | null,
    until: Until | null,
    sample: Readonly<Record<string, string>> | null = null,
  ): TemplateResult {
    const values = card === null ? null : card.values
    const shows = (prop: CardSpot | 'avatar'): boolean => this.shows(values, prop)
    const line = shows('heading') || shows('subline')
    const main = shows('avatar') || line || shows('heading2') || shows('time')
    return html`
      ${main
        ? html`<div class="main">
            ${shows('avatar') ? this.avatar(values, sample) : nothing}
            <div class="ident">
              ${line
                ? html`<div class="line">
                    ${shows('heading') ? this.spot('heading', 'name', values, sample) : nothing}
                    ${shows('subline') ? this.spot('subline', 'meta', values, sample) : nothing}
                  </div>`
                : nothing}
              ${shows('heading2') ? this.spot('heading2', 'owner', values, sample) : nothing}
            </div>
            ${shows('time') ? this.spot('time', 'time', values, sample) : nothing}
          </div>`
        : nothing}
      ${shows('text') ? this.spot('text', 'text', values, sample) : nothing}
      ${shows('date') ? this.spot('date', 'date', values, sample) : nothing}
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

  // In the editor the card of a column shows the first sample row the data
  // puts into that column, so each column shows another record.
  private sampleIn(column: number): Readonly<Record<string, string>> | null {
    const samples = readSamples(this)
    const field = this.columnsField.trim()
    const row = samples?.rows.find((r) => spotOf(this.columns, field, r).column === column)
    return samples === null || row === undefined ? null : this.cardValues(row, samples.read)
  }

  // The cards of a place; a column by the clock orders them by their time.
  private cardsAt(spot: Spot): TemplateResult | TemplateResult[] {
    const byTime = this.columns[spot.column]?.byTime === true
    if (this.preview) {
      // One sample card per column, in its first place: the button of the
      // column is typed on it. The other places stand empty, as in the mask.
      if (spot.place !== 0) return []
      return html`${byTime ? SAMPLE_HOUR_LINE : nothing}<div class="card">${
        this.cardContent(spot.column, null, byTime ? SAMPLE_UNTIL : null, this.sampleIn(spot.column))
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
    { kind: 'source', helpers: 'beside' },
    { kind: 'recordPick' },
    { kind: 'list', binding: KANBAN_COLUMNS_BINDING },
    bindable<typeof kanbanProperties>(CARD_SPOTS),
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
