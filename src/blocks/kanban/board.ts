import { bindingAttr, capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { recordIndexOf } from '../../softengine/data'
import { chooseSelection, giverIdOf, selectionRefind, traitOf } from '../behavior/selection'
import { holeDataPreamble, makeDataLink, sourceIdOf } from '../behavior/source'
import { reportChainsError, runEvent } from '../behavior/events'
import {
  CARD_TYPE,
  TARGET_ATTR,
  boardPlan,
  cardsOf,
  columnTitle,
  columnValue,
  fallbackColumn,
  isCard,
  isColumn,
  placementOf,
  type ColumnPlace,
} from './places'
import { WITHOUT_COLUMN, cardsReason, misplacedNotice } from './reasons'

const DRAGS_ATTR = 'data-ff-dragging'

// What the board writes on its element; the kanban only shows it.
export interface BoardElement extends HTMLElement {
  columnsField: string
  emptyText: string

  moveMessage: string
  readMessage: string
  boardHint: string
  busy: boolean
}

interface CardData {
  row: unknown

  // The record number the host knows this row by; empty when the source names none.
  record: string

  key: string
}

// One board holds everything a kanban knows at runtime: its cards, where they
// lie and what is being dragged. The elements only show what it writes on them.
class Board {
  private cards = new Map<HTMLElement, CardData>()

  private template: HTMLElement | null = null

  private writes = false

  private dragging: HTMLElement | null = null

  private hover: ColumnPlace | null = null

  private unwire: (() => void)[] = []

  private readonly el: BoardElement

  constructor(el: BoardElement) {
    this.el = el
  }

  hydrate(): void {
    const el = this.el
    const preamble = holeDataPreamble(el)
    const plan = boardPlan(el, el.columnsField)
    const template = this.cardTemplate()
    const reason = cardsReason(sourceIdOf(el), preamble, template !== null)

    el.boardHint = plan.columns.length === 0 ? WITHOUT_COLUMN : ''

    if (!preamble || template === null || plan.columns.length === 0) {
      this.takeCards(new Map())
      el.readMessage = ''
      this.showPlaces(plan.columns, reason)
      return
    }

    const byKey = new Map([...this.cards].map(([card, data]) => [data.key, card]))
    const spots = capability(blockType(CARD_TYPE), 'bindable')?.spots ?? []
    const next = new Map<HTMLElement, CardData>()
    const order = new Map<ColumnPlace, HTMLElement[]>()
    const occurrences = new Map<string, number>()
    const recordCount = new Map<string, number>()
    let withoutValue = 0
    let withoutColumn = 0

    for (const row of preamble.rows) {
      const record = recordIndexOf(preamble.source, row)
      if (record !== '') recordCount.set(record, (recordCount.get(record) ?? 0) + 1)
    }

    for (const row of preamble.rows) {
      const record = recordIndexOf(preamble.source, row)
      const unique = record !== '' && recordCount.get(record) === 1
      const base = JSON.stringify([
        preamble.source.id,
        unique ? 'record' : 'content',
        unique ? record : traitOf(row),
      ])
      const number = occurrences.get(base) ?? 0
      occurrences.set(base, number + 1)
      const key = `${base}:${number}`

      const card = byKey.get(key) ?? template.cloneNode(true) as HTMLElement
      next.set(card, { row, record, key })
      card.draggable = !this.writes
      card.tabIndex = 0
      card.setAttribute('role', 'button')
      for (const spot of spots) {
        const field = card.getAttribute(bindingAttr(spot.prop)) ?? ''
        if (field !== '') Object.assign(card, { [spot.prop]: preamble.read(row, field) })
      }

      const placement = placementOf(plan, row)
      if (placement.trouble === 'withoutValue') withoutValue += 1
      if (placement.trouble === 'withoutColumn') withoutColumn += 1
      const lying = order.get(placement.column) ?? []
      lying.push(card)
      order.set(placement.column, lying)
    }

    this.takeCards(next)
    for (const [column, cards] of order) {
      let anchor: Element | null = cardsOf(column)[0] ?? null
      for (const card of cards) {
        if (card === anchor) anchor = anchor.nextElementSibling
        else {
          if (this.dragging === card) this.endDrag()
          column.insertBefore(card, anchor)
        }
      }
    }

    this.showPlaces(plan.columns, reason)
    el.readMessage = misplacedNotice(withoutValue, withoutColumn, columnTitle(fallbackColumn(plan)))
    this.refreshSelection()
  }

  wire(): void {
    if (this.unwire.length > 0) return
    const el = this.el
    const on = <K extends keyof HTMLElementEventMap>(
      name: K,
      fn: (event: HTMLElementEventMap[K]) => void,
    ): void => {
      el.addEventListener(name, fn)
      this.unwire.push(() => el.removeEventListener(name, fn))
    }

    on('click', (event) => {
      const card = this.cardFrom(event)
      if (card) this.choose(card)
    })
    on('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const card = this.cardFrom(event)
      if (!card || event.target !== card) return
      event.preventDefault()
      this.choose(card)
    })
    on('dragstart', (event) => {
      const card = this.cardFrom(event)
      if (!card) return
      if (this.writes) { event.preventDefault(); return }
      this.dragging = card
      event.dataTransfer?.setData('text/plain', this.cards.get(card)?.record ?? '')
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
      setTimeout(() => { if (this.dragging === card) card.setAttribute(DRAGS_ATTR, '') }, 0)
    })
    on('dragend', () => { this.endDrag() })
    on('dragover', (event) => {
      const column = this.columnFrom(event)
      if (!this.dragging || !column || this.writes) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      this.markTarget(column)
    })
    on('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !el.contains(event.relatedTarget)) {
        this.markTarget(null)
      }
    })
    on('drop', (event) => {
      const column = this.columnFrom(event)
      const card = this.dragging
      if (!column || !card) return
      event.preventDefault()
      void this.move(card, column)
      this.endDrag()
    })
  }

  stopped(): void {
    for (const off of this.unwire) off()
    this.unwire = []
    this.endDrag()
  }

  private cardTemplate(): HTMLElement | null {
    if (this.template) return this.template
    const source = this.el.querySelector<HTMLTemplateElement>('template[data-ff-template]')
      ?.content.firstElementChild
    if (!(source instanceof HTMLElement)) return null
    this.template = source.cloneNode(true) as HTMLElement
    return this.template
  }

  // Cards no record asks for any more leave the board.
  private takeCards(next: Map<HTMLElement, CardData>): void {
    for (const card of this.cards.keys()) {
      if (next.has(card)) continue
      if (this.dragging === card) this.endDrag()
      card.remove()
    }
    this.cards = next
  }

  private showPlaces(columns: readonly ColumnPlace[], reason: string): void {
    for (const column of columns) {
      const count = cardsOf(column).length
      column.cardCount = count
      column.emptyHint = count === 0 ? (reason !== '' ? reason : this.el.emptyText) : ''
    }
  }

  private refreshSelection(): void {
    const cards = [...this.cards.keys()]
    const hit = new Set(selectionRefind(
      giverIdOf(this.el),
      cards,
      (card) => this.cards.get(card)?.row,
      (card) => this.cards.get(card)?.key ?? '',
    ))
    cards.forEach((card, i) => {
      card.toggleAttribute('data-ff-selection', hit.has(i))
      card.setAttribute('aria-pressed', String(hit.has(i)))
    })
  }

  private choose(card: HTMLElement): void {
    const data = this.cards.get(card)
    if (!data) return
    chooseSelection(giverIdOf(this.el), data.row, data.key)
    runEvent(this.el, 'onCardClick', { PINDEX: data.record }).catch(reportChainsError)
  }

  private columnFrom(event: Event): ColumnPlace | null {
    for (const el of event.composedPath()) {
      if (isColumn(el) && this.el.contains(el)) return el
    }
    return null
  }

  private cardFrom(event: Event): HTMLElement | null {
    for (const el of event.composedPath()) {
      if (isCard(el) && this.cards.has(el)) return el
    }
    return null
  }

  private markTarget(next: ColumnPlace | null): void {
    if (this.hover === next) return
    this.hover?.removeAttribute(TARGET_ATTR)
    this.hover = next
    this.hover?.setAttribute(TARGET_ATTR, '')
  }

  private endDrag(): void {
    this.dragging?.removeAttribute(DRAGS_ATTR)
    this.dragging = null
    this.markTarget(null)
  }

  private showWriteState(writes: boolean): void {
    this.writes = writes
    this.el.busy = writes
    this.el.setAttribute('aria-busy', String(writes))
    for (const card of this.cards.keys()) card.draggable = !writes
  }

  private recount(): void {
    this.showPlaces(boardPlan(this.el, this.el.columnsField).columns, '')
  }

  // The card lies in its new column at once. Fails the action, it lies again
  // where it came from; the next delivery sorts by the data anyway.
  private async move(card: HTMLElement, column: ColumnPlace): Promise<void> {
    const el = this.el
    if (this.writes) {
      el.moveMessage = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
      return
    }
    const data = this.cards.get(card)
    const from = card.parentElement
    if (!data || from === column || !isColumn(from ?? el)) return

    column.append(card)
    this.recount()
    this.showWriteState(true)
    el.moveMessage = ''
    let back = ''
    try {
      const result = await runEvent(el, 'onCardDrop', {
        PINDEX: data.record,
        VALUE: columnValue(column),
      })
      if (result.cancelled) {
        back = 'Die Aktion ist fehlgeschlagen. Die Karte liegt wieder, wo sie war.'
      } else if (!result.ran) {
        back = result.busy
          ? 'Die Aktion läuft bereits.'
          : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
      } else if (!result.written) {
        back = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
      }
    } catch (error) {
      back = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
      reportChainsError(error)
    } finally {
      this.showWriteState(false)
    }
    if (back !== '' && card.parentElement === column && from !== null) {
      from.append(card)
      this.recount()
    }
    el.moveMessage = back
  }
}

// A board outlives a disconnect: its cards stay in the mask, so a kanban that
// comes back finds them again instead of cloning them a second time.
const boards = new WeakMap<BoardElement, Board>()

function boardOf(el: BoardElement): Board {
  let board = boards.get(el)
  if (board === undefined) {
    board = new Board(el)
    boards.set(el, board)
  }
  return board
}

const link = makeDataLink<BoardElement>({
  hydrate: (el) => { boardOf(el).hydrate() },
  wire: (el) => { boardOf(el).wire() },
})

export function boardRegister(el: BoardElement): void {
  link.connect(el)
}

export function boardUnregister(el: BoardElement): void {
  link.disconnect(el)
  boards.get(el)?.stopped()
}
