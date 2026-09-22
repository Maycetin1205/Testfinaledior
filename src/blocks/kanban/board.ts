import { bindingAttr, capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { recordIndexOf } from '../../softengine/data'
import { chooseSelection, giverIdOf, selectionRefind, traitOf } from '../behavior/selection'
import { holeDataPreamble, makeDataLink, sourceIdOf } from '../behavior/source'
import { reportChainsError, runEvent } from '../behavior/events'
import { Card } from '../card/Card'
import {
  CARD_TYPE,
  COLUMN_TITLE_STANDARD,
  ROOM_EMPTY_TEXT,
  TARGET_ATTR,
  boardPlan,
  cardsOf,
  columnValue,
  dropPlace,
  fallbackColumn,
  isCard,
  isColumn,
  isRoom,
  placeTitle,
  placementFits,
  placementOf,
  roomValue,
  roomsOf,
  targetsOf,
  type BoardTarget,
  type CardPlace,
  type ColumnPlace,
} from './places'
import { WITHOUT_COLUMN, cardsReason, misplacedNotice } from './reasons'

const DRAGS_ATTR = 'data-ff-dragging'

// How long a sent move waits for data that confirm it before it says so.
const CONFIRM_WAIT_MS = 20000

// What the board writes on its element; the kanban only shows it.
export interface BoardElement extends HTMLElement {
  columnsField: string
  emptyText: string

  moveMessage: string
  readMessage: string
  boardHint: string
  busy: boolean
  selectionTitle: string
  currentTarget: string
  targets: BoardTarget[]
}

interface CardData {
  row: unknown

  // Empty when no record number names this row alone; such a card cannot move.
  record: string

  key: string
}

interface Sent {
  key: string
  place: CardPlace
  arrived: boolean
}

function cardTitle(card: HTMLElement, without: string): string {
  const text = card instanceof Card ? card.heading : card.getAttribute('heading') ?? ''
  return text.trim() === '' ? without : text
}

// One board holds everything a kanban knows at runtime: its cards, where they
// lie, what is being dragged and what was sent to the host. The three elements
// only show what it writes on them.
class Board {
  private cards = new Map<HTMLElement, CardData>()

  private targets = new Map<string, { column: ColumnPlace; place: CardPlace }>()

  private selected: HTMLElement | null = null

  private template: HTMLElement | null = null

  private writes = false

  private sent: Sent | null = null

  private waitTimer?: ReturnType<typeof setTimeout>

  private dragging: HTMLElement | null = null

  private hover: CardPlace | null = null

  private unwire: (() => void)[] = []

  private readonly el: BoardElement

  constructor(el: BoardElement) {
    this.el = el
  }

  hydrate(delivery: boolean): void {
    const el = this.el
    const preamble = holeDataPreamble(el)
    const plan = boardPlan(el, el.columnsField)
    const template = this.cardTemplate()
    const reason = cardsReason(sourceIdOf(el), preamble, template !== null)

    el.boardHint = plan.columns.length === 0 ? WITHOUT_COLUMN : ''

    if (!preamble || template === null || plan.columns.length === 0) {
      this.takeCards(new Map())
      this.targets = new Map()
      el.targets = []
      el.readMessage = ''
      this.showPlaces(plan.columns, reason)
      this.refreshControls()
      return
    }

    const found = targetsOf(plan)
    this.targets = found.byId
    el.targets = found.list

    if (delivery && this.sent) this.sent.arrived = false

    const byKey = new Map([...this.cards].map(([card, data]) => [data.key, card]))
    const spots = capability(blockType(CARD_TYPE), 'bindable')?.spots ?? []
    const next = new Map<HTMLElement, CardData>()
    const order = new Map<CardPlace, HTMLElement[]>()
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
      next.set(card, { row, record: unique ? record : '', key })
      card.draggable = !this.writes && unique
      card.tabIndex = 0
      card.setAttribute('role', 'button')
      for (const spot of spots) {
        const field = card.getAttribute(bindingAttr(spot.prop)) ?? ''
        if (field !== '') Object.assign(card, { [spot.prop]: preamble.read(row, field) })
      }
      const title = cardTitle(card, 'Karte')
      card.setAttribute('aria-label', unique
        ? title
        : `${title} – keine eindeutige Satznummer, Verschieben nicht möglich`)

      const placement = placementOf(plan, row)
      if (placement.trouble === 'withoutValue') withoutValue += 1
      if (placement.trouble === 'withoutColumn') withoutColumn += 1
      const lying = order.get(placement.place) ?? []
      lying.push(card)
      order.set(placement.place, lying)

      if (delivery && this.sent?.key === key && this.sent.place === placement.place) {
        this.sent.arrived = placementFits(plan, row, placement.column, placement.place)
      }
    }

    this.takeCards(next)
    for (const [place, cards] of order) {
      let anchor: Element | null = cardsOf(place)[0] ?? null
      for (const card of cards) {
        if (card === anchor) anchor = anchor.nextElementSibling
        else {
          if (this.dragging === card) this.endDrag()
          place.insertBefore(card, anchor)
        }
      }
    }

    this.showPlaces(plan.columns, reason)
    el.readMessage = misplacedNotice(
      withoutValue,
      withoutColumn,
      placeTitle(fallbackColumn(plan), COLUMN_TITLE_STANDARD),
    )
    this.refreshSelection()
    if (this.sent?.arrived && !this.writes) this.confirmed()
  }

  moveToTarget(id: string): void {
    const chosen = this.targets.get(id)
    if (chosen && this.selected) void this.move(this.selected, chosen.column, chosen.place)
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
      if (this.writes || !card.draggable) { event.preventDefault(); return }
      this.dragging = card
      event.dataTransfer?.setData('text/plain', this.cards.get(card)?.record ?? '')
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
      setTimeout(() => { if (this.dragging === card) card.setAttribute(DRAGS_ATTR, '') }, 0)
    })
    on('dragend', () => { this.endDrag() })
    on('dragover', (event) => {
      const column = this.placeFrom(event, isColumn)
      if (!this.dragging || !column || this.writes) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      this.markTarget(dropPlace(column, this.placeFrom(event, isRoom)))
    })
    on('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !el.contains(event.relatedTarget)) {
        this.markTarget(null)
      }
    })
    on('drop', (event) => {
      const column = this.placeFrom(event, isColumn)
      const card = this.dragging
      if (!column || !card) return
      event.preventDefault()
      void this.move(card, column, dropPlace(column, this.placeFrom(event, isRoom)))
      this.endDrag()
    })
  }

  stopped(): void {
    for (const off of this.unwire) off()
    this.unwire = []
    clearTimeout(this.waitTimer)
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
      const rooms = roomsOf(column)
      let count = cardsOf(column).length
      for (const room of rooms) {
        const own = cardsOf(room).length
        count += own
        room.emptyHint = own > 0 ? '' : reason !== '' ? reason : ROOM_EMPTY_TEXT
      }
      column.cardCount = count
      column.emptyHint = rooms.length === 0 && count === 0
        ? reason !== '' ? reason : this.el.emptyText
        : ''
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
    this.selected = cards.find((_, i) => hit.has(i)) ?? null
    this.refreshControls()
  }

  private refreshControls(): void {
    const card = this.selected
    this.el.selectionTitle = card ? cardTitle(card, 'Gewählte Karte') : ''
    this.el.currentTarget = card
      ? [...this.targets].find(([, t]) => t.place === card.parentElement)?.[0] ?? ''
      : ''
  }

  private choose(card: HTMLElement): void {
    const data = this.cards.get(card)
    if (!data) return
    chooseSelection(giverIdOf(this.el), data.row, data.key)
    runEvent(this.el, 'onCardClick', { PINDEX: data.record }).catch(reportChainsError)
  }

  private placeFrom<T extends HTMLElement>(
    event: Event,
    is: (el: EventTarget) => el is T,
  ): T | null {
    for (const el of event.composedPath()) {
      if (is(el) && this.el.contains(el)) return el
    }
    return null
  }

  private cardFrom(event: Event): HTMLElement | null {
    const card = this.placeFrom(event, isCard)
    return card && this.cards.has(card) ? card : null
  }

  private markTarget(next: CardPlace | null): void {
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
    for (const [card, data] of this.cards) card.draggable = !writes && data.record !== ''
  }

  private confirmed(): void {
    clearTimeout(this.waitTimer)
    this.sent = null
    this.el.moveMessage = 'Verschiebung in den geladenen Daten bestätigt.'
  }

  private async move(card: HTMLElement, column: ColumnPlace, place: CardPlace): Promise<void> {
    const el = this.el
    if (this.writes) {
      el.moveMessage = 'Eine Verschiebung wird bereits gesendet. Bitte kurz warten.'
      return
    }
    const data = this.cards.get(card)
    if (!data || data.record === '') {
      el.moveMessage = 'Diese Karte hat keine eindeutige Satznummer. Prüfe die Datenquelle im Editor.'
      return
    }
    if (card.parentElement === place) return

    clearTimeout(this.waitTimer)
    this.sent = { key: data.key, place, arrived: false }
    this.showWriteState(true)
    el.moveMessage = 'Verschiebung wird gesendet …'
    try {
      const result = await runEvent(el, 'onCardDrop', {
        PINDEX: data.record,
        VALUE: columnValue(column),
        ZIMMER: place === column ? '' : roomValue(place),
      })
      if (result.cancelled) {
        this.sent = null
        el.moveMessage = 'Die Aktion ist fehlgeschlagen. Die Karte zeigt den zuletzt geladenen Stand.'
      } else if (!result.ran) {
        this.sent = null
        el.moveMessage = result.busy
          ? 'Die Aktion läuft bereits.'
          : 'Für „Karte verschoben“ ist noch keine Aktion eingerichtet.'
      } else if (!result.written) {
        this.sent = null
        el.moveMessage = 'Aktion ausgeführt. Sie hat keine Daten geschrieben.'
      } else if (this.sent?.arrived) {
        this.confirmed()
      } else {
        el.moveMessage = 'Gesendet. Die Karte wechselt ihren Platz, sobald neue Daten die Änderung bestätigen.'
        this.waitTimer = setTimeout(() => {
          if (this.sent) {
            el.moveMessage = 'Die Verschiebung ist noch nicht durch neue Daten bestätigt. '
              + 'Angezeigt wird der zuletzt geladene Stand.'
          }
        }, CONFIRM_WAIT_MS)
      }
    } catch (error) {
      this.sent = null
      el.moveMessage = 'Verschiebung fehlgeschlagen. Bitte die Fehlermeldung beachten.'
      reportChainsError(error)
    } finally {
      this.showWriteState(false)
    }
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
  hydrate: (el, delivery) => { boardOf(el).hydrate(delivery) },
  wire: (el) => { boardOf(el).wire() },
})

export function boardRegister(el: BoardElement): void {
  link.connect(el)
}

export function boardUnregister(el: BoardElement): void {
  link.disconnect(el)
  boards.get(el)?.stopped()
}

export function boardMoveTo(el: BoardElement, targetId: string): void {
  boards.get(el)?.moveToTarget(targetId)
}
