import { css, unsafeCSS } from 'lit'
import { fieldRead } from '../../softengine/data'
import { Card } from '../card/Card'

export const COLUMN_TAG = 'ff-kanban-column'
export const ROOM_TAG = 'ff-kanban-room'
export const CARD_TAG = Card.tag
export const CARD_TYPE = Card.type

export const COLUMN_TITLE_STANDARD = 'Neue Spalte'
export const ROOM_TITLE_STANDARD = 'Neue Unterteilung'
export const ROOM_EMPTY_TEXT = 'frei · hierher ziehen'

export const TARGET_CLASS = 'target'
export const TARGET_ATTR = 'data-ff-target'

// The frame a column and a room share: they slot the cards and mark themselves
// while a dragged card would land in them.
export const placeStyle = css`
  ::slotted(*) { margin-top: 24px; }
  slot { display: contents; }

  :host([${unsafeCSS(TARGET_ATTR)}]) .${unsafeCSS(TARGET_CLASS)} {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
`

// A place is where cards lie: a column, or a room inside one. The board fills
// both and tells them what to show while they hold no card.
export interface CardPlace extends HTMLElement {
  emptyHint: string
}

export interface ColumnPlace extends CardPlace {
  cardCount: number
}

export function isColumn(el: EventTarget): el is ColumnPlace {
  return el instanceof HTMLElement && el.tagName.toLowerCase() === COLUMN_TAG
}

export function isRoom(el: EventTarget): el is CardPlace {
  return el instanceof HTMLElement && el.tagName.toLowerCase() === ROOM_TAG
}

export function isCard(el: EventTarget): el is HTMLElement {
  return el instanceof HTMLElement && el.tagName.toLowerCase() === CARD_TAG
}

export function columnsOf(board: HTMLElement): ColumnPlace[] {
  return Array.from(board.children).filter(isColumn)
}

export function roomsOf(column: ColumnPlace): CardPlace[] {
  return Array.from(column.children).filter(isRoom)
}

export function cardsOf(place: CardPlace): HTMLElement[] {
  return Array.from(place.children).filter(isCard)
}

export function placeTitle(place: HTMLElement, standard: string): string {
  return place.getAttribute('heading') ?? standard
}

// What the ERP holds for a place: its own value, or its title when it has none.
function placeValue(place: HTMLElement, standard: string): string {
  const value = (place.getAttribute('value') ?? '').trim()
  return value !== '' ? value : placeTitle(place, standard)
}

export function columnValue(column: ColumnPlace): string {
  return placeValue(column, COLUMN_TITLE_STANDARD)
}

export function roomValue(room: CardPlace): string {
  return placeValue(room, ROOM_TITLE_STANDARD)
}

function slotWithValue(value: string, values: readonly string[]): number {
  const wanted = value.trim().toLowerCase()
  if (wanted === '') return -1
  for (let i = 0; i < values.length; i++) {
    const candidate = values[i].trim().toLowerCase()
    if (candidate !== '' && candidate === wanted) return i
  }
  return -1
}

// What the board reads once and then asks for every record.
export interface BoardPlan {
  columns: readonly ColumnPlace[]

  values: readonly string[]

  field: string

  catchAll: number
}

export function boardPlan(board: HTMLElement, columnsField: string): BoardPlan {
  const columns = columnsOf(board)
  return {
    columns,
    values: columns.map(columnValue),
    field: columnsField.trim(),
    catchAll: columns.findIndex((c) => (c.getAttribute('catchall') ?? '').trim() === 'ja'),
  }
}

// Where a card lands whose record names no column: the catch-all, or the first.
export function fallbackColumn(plan: BoardPlan): ColumnPlace {
  return plan.columns[plan.catchAll >= 0 ? plan.catchAll : 0]
}

function roomFor(column: ColumnPlace, row: unknown): CardPlace | null {
  const rooms = roomsOf(column)
  if (rooms.length === 0) return null
  const field = column.getAttribute('groupingfield') ?? ''
  if (field === '') return rooms[0]
  const slot = slotWithValue(fieldRead(row, field), rooms.map(roomValue))
  return slot >= 0 ? rooms[slot] : rooms[0]
}

// Why a card lies somewhere its record does not name.
export type PlacementTrouble = 'none' | 'withoutValue' | 'withoutColumn'

export interface Placement {
  column: ColumnPlace

  place: CardPlace

  trouble: PlacementTrouble
}

export function placementOf(plan: BoardPlan, row: unknown): Placement {
  const value = plan.field === '' ? '' : fieldRead(row, plan.field)
  const slot = slotWithValue(value, plan.values)
  const column = slot >= 0 ? plan.columns[slot] : fallbackColumn(plan)
  const fitting = slot >= 0 || plan.field === '' || plan.catchAll >= 0
  return {
    column,
    place: roomFor(column, row) ?? column,
    trouble: fitting ? 'none' : value === '' ? 'withoutValue' : 'withoutColumn',
  }
}

// After a move: does the freshly delivered record really name this place, or
// does the card only lie here because nothing else fit?
export function placementFits(
  plan: BoardPlan,
  row: unknown,
  column: ColumnPlace,
  place: CardPlace,
): boolean {
  if (plan.field === '') return false
  if (slotWithValue(fieldRead(row, plan.field), [columnValue(column)]) !== 0) return false
  if (place === column) return true
  const roomField = column.getAttribute('groupingfield') ?? ''
  return roomField !== ''
    && slotWithValue(fieldRead(row, roomField), [roomValue(place)]) === 0
}

// Where a card dropped on this column comes to lie: the room under the pointer,
// else the column's first room, else the column itself.
export function dropPlace(column: ColumnPlace, room: CardPlace | null): CardPlace {
  return room ?? roomsOf(column)[0] ?? column
}

export interface BoardTarget {
  id: string

  name: string
}

export interface BoardTargets {
  list: BoardTarget[]

  byId: Map<string, { column: ColumnPlace; place: CardPlace }>
}

// Every place a card can be moved to, named as the operator reads it.
export function targetsOf(plan: BoardPlan): BoardTargets {
  const targets: BoardTargets = { list: [], byId: new Map() }
  plan.columns.forEach((column, si) => {
    const rooms = roomsOf(column)
    const name = placeTitle(column, COLUMN_TITLE_STANDARD)
    const places: (CardPlace | null)[] = rooms.length > 0 ? rooms : [null]
    places.forEach((room, zi) => {
      const id = `${si}:${zi}`
      targets.byId.set(id, { column, place: room ?? column })
      targets.list.push({
        id,
        name: room ? `${name} / ${placeTitle(room, ROOM_TITLE_STANDARD)}` : name,
      })
    })
  })
  return targets
}
