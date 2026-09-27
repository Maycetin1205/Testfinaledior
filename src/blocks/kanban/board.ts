import { chooseSelection, giverIdOf, relocateSelection, traitOf } from '../../runtime/selection'
import { readDataPreamble, makeDataLink, recordOf, type DataPreamble } from '../../runtime/source'
import { runEvent } from '../../runtime/events'
import { kanbanColumnsFrom, type KanbanColumn } from './columns'
import { columnOf, columnValue } from './places'

export interface CardData {
  key: string
  row: unknown

  // The record number the host knows this row by; empty when the source names none.
  record: string

  // The column the data puts the card in.
  column: number

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
  target = -1
  writes = false

  // A card put into another column while its action runs, or until the data
  // put it there as well.
  private readonly moved = new Map<string, number>()

  private readonly el: BoardElement

  constructor(el: BoardElement) {
    this.el = el
  }

  columnOf(card: CardData): number {
    return this.moved.get(card.key) ?? card.column
  }

  cardsIn(column: number): CardData[] {
    return this.cards.filter((card) => this.columnOf(card) === column)
  }

  // A card keeps its key across deliveries: the record number where it is
  // unique, else the content, so the choice survives a delivery.
  hydrate(): void {
    const el = this.el
    const preamble = readDataPreamble(el)
    if (!preamble) {
      this.cards = []
      this.chosen = ''
      el.requestUpdate()
      return
    }
    const columns = kanbanColumnsFrom(el.columns)
    const field = el.columnsField.trim()
    const recordCount = new Map<string, number>()
    for (const row of preamble.rows) {
      const record = recordOf(preamble.source, row)
      if (record !== '') recordCount.set(record, (recordCount.get(record) ?? 0) + 1)
    }
    const occurrences = new Map<string, number>()
    this.cards = preamble.rows.map((row) => {
      const record = recordOf(preamble.source, row)
      const unique = record !== '' && recordCount.get(record) === 1
      const base = JSON.stringify([preamble.source.id, unique ? 'record' : 'content', unique ? record : traitOf(row)])
      const number = occurrences.get(base) ?? 0
      occurrences.set(base, number + 1)
      return {
        key: `${base}:${number}`,
        row,
        record,
        column: columnOf(columns, field, row),
        values: el.cardValues(row, preamble.read),
      }
    })
    if (!this.writes) this.moved.clear()
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
    if (this.dragging === '' && this.target === -1) return
    this.dragging = ''
    this.target = -1
    this.el.requestUpdate()
  }

  over(event: DragEvent, column: number): void {
    if (this.dragging === '' || this.writes) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    if (this.target === column) return
    this.target = column
    this.el.requestUpdate()
  }

  leave(event: DragEvent): void {
    const into = event.relatedTarget
    const board = event.currentTarget
    if (into instanceof Node && board instanceof Node && board.contains(into)) return
    if (this.target === -1) return
    this.target = -1
    this.el.requestUpdate()
  }

  drop(event: DragEvent, column: number): void {
    const card = this.cards.find((c) => c.key === this.dragging)
    this.endDrag()
    if (!card) return
    event.preventDefault()
    void this.move(card, column)
  }

  // The card lies in its new column at once. Fails the action, it lies again
  // where it came from; the next delivery sorts by the data anyway.
  private async move(card: CardData, column: number): Promise<void> {
    const target = kanbanColumnsFrom(this.el.columns)[column]
    if (this.writes || !target || this.columnOf(card) === column) return
    this.moved.set(card.key, column)
    this.writes = true
    this.el.requestUpdate()
    let back: boolean
    try {
      const result = await runEvent(this.el, 'onCardDrop', { PINDEX: card.record, VALUE: columnValue(target) })
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
  hydrate: (el) => { el.board.hydrate() },
})

export const boardRegister = link.connect
export const boardUnregister = link.disconnect
