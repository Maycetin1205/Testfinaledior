import { chooseSelection, giverIdOf, relocateSelection } from '../../runtime/selection'
import { readDataPreamble, makeDataLink, recordOf, rowKeys, type DataPreamble } from '../../runtime/source'
import { runEvent } from '../../runtime/events'
import type { KanbanColumn } from './columns'
import { placeValue, sameSpot, spotOf, type Spot } from './places'

export interface CardData {
  key: string
  row: unknown

  // The record number the host knows this row by; empty when the source names none.
  record: string

  // The place the data puts the card at.
  spot: Spot

  // What each spot of the card shows.
  values: Readonly<Record<string, string>>
}

// What the board reads off its element and tells it.
interface BoardElement extends HTMLElement {
  columns: readonly KanbanColumn[]
  columnsField: string
  cardValues: (row: unknown, read: DataPreamble['read']) => Record<string, string>
  requestUpdate: () => void
}

// One board holds everything a kanban knows at runtime: its cards, where they
// lie and what is being dragged. The kanban draws from it.
export class Board {
  cards: readonly CardData[] = []

  chosen = ''
  dragging = ''
  target: Spot | null = null
  writes = false

  // A card put at another place while its action runs, or until the data put
  // it there as well.
  private readonly moved = new Map<string, Spot>()

  private readonly el: BoardElement

  constructor(el: BoardElement) {
    this.el = el
  }

  spotOf(card: CardData): Spot {
    return this.moved.get(card.key) ?? card.spot
  }

  cardsAt(spot: Spot): CardData[] {
    return this.cards.filter((card) => sameSpot(this.spotOf(card), spot))
  }

  cardsIn(column: number): CardData[] {
    return this.cards.filter((card) => this.spotOf(card).column === column)
  }

  isTarget(spot: Spot): boolean {
    return this.target !== null && sameSpot(this.target, spot)
  }

  // A moved card stays where it was put until data arrives; a new choice is
  // no data.
  hydrate(delivery: boolean): void {
    const el = this.el
    const preamble = readDataPreamble(el)
    if (!preamble) {
      this.cards = []
      this.chosen = ''
      el.requestUpdate()
      return
    }
    const columns = el.columns
    const field = el.columnsField.trim()
    const keys = rowKeys(preamble.source, preamble.rows)
    this.cards = preamble.rows.map((row, i) => ({
      key: keys[i],
      row,
      record: recordOf(preamble.source, row),
      spot: spotOf(columns, field, row),
      values: el.cardValues(row, preamble.read),
    }))
    if (delivery && !this.writes) this.moved.clear()
    if (!this.cards.some((card) => card.key === this.dragging)) this.endDrag()
    const hit = relocateSelection(giverIdOf(el), this.cards, (card) => card.row, (card) => card.key)
    this.chosen = hit.length > 0 ? this.cards[hit[0]].key : ''
    el.requestUpdate()
  }

  choose(card: CardData): void {
    chooseSelection(giverIdOf(this.el), card.row, card.key)
    runEvent(this.el, 'onCardClick', { PINDEX: card.record }).catch(() => {})
  }

  startDrag(event: DragEvent, card: CardData): void {
    if (this.writes) {
      event.preventDefault()
      return
    }
    this.dragging = card.key
    event.dataTransfer?.setData('text/plain', card.record)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    this.el.requestUpdate()
  }

  endDrag(): void {
    if (this.dragging === '' && this.target === null) return
    this.dragging = ''
    this.target = null
    this.el.requestUpdate()
  }

  over(event: DragEvent, spot: Spot): void {
    if (this.dragging === '' || this.writes) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    if (this.isTarget(spot)) return
    this.target = spot
    this.el.requestUpdate()
  }

  leave(event: DragEvent): void {
    const into = event.relatedTarget
    const board = event.currentTarget
    if (into instanceof Node && board instanceof Node && board.contains(into)) return
    if (this.target === null) return
    this.target = null
    this.el.requestUpdate()
  }

  // The button under a card: on to the first place of the next column.
  advance(card: CardData): void {
    const column = this.spotOf(card).column + 1
    if (column >= this.el.columns.length) return
    void this.move(card, { column, place: 0 })
  }

  // The button of a column that runs the board's action for its card.
  press(card: CardData): void {
    runEvent(this.el, 'onCardButton', { PINDEX: card.record }).catch(() => {})
  }

  drop(event: DragEvent, spot: Spot): void {
    const card = this.cards.find((c) => c.key === this.dragging)
    this.endDrag()
    if (!card) return
    event.preventDefault()
    event.stopPropagation()
    void this.move(card, spot)
  }

  // The card lies at its new place at once. Fails the action, it lies again
  // where it came from; the next delivery sorts by the data anyway.
  private async move(card: CardData, spot: Spot): Promise<void> {
    const column = this.el.columns[spot.column]
    const place = column?.places[spot.place]
    if (this.writes || !column || !place || sameSpot(this.spotOf(card), spot)) return
    this.moved.set(card.key, spot)
    this.writes = true
    this.el.requestUpdate()
    let back: boolean
    try {
      const result = await runEvent(this.el, 'onCardDrop', { PINDEX: card.record, VALUE: placeValue(column, place) })
      back = result.cancelled || !result.ran || !result.written
    } catch {
      back = true
    } finally {
      this.writes = false
    }
    if (back) this.moved.delete(card.key)
    this.el.requestUpdate()
  }
}

const link = makeDataLink<BoardElement & { board: Board }>({
  hydrate: (el, delivery) => { el.board.hydrate(delivery) },
})

export const boardRegister = link.connect
export const boardUnregister = link.disconnect
