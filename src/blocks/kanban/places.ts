import { css, unsafeCSS } from 'lit'
import { fieldRead } from '../../softengine/data'
import { Card } from '../card/Card'

export const COLUMN_TAG = 'ff-kanban-column'
const CARD_TAG = Card.tag
export const CARD_TYPE = Card.type

export const COLUMN_TITLE_STANDARD = 'Neue Spalte'

export const TARGET_CLASS = 'target'
export const TARGET_ATTR = 'data-ff-target'

// A column slots the cards and marks itself while a dragged card would land in it.
export const placeStyle = css`
  ::slotted(*) { margin-top: 24px; }
  slot { display: contents; }

  :host([${unsafeCSS(TARGET_ATTR)}]) .${unsafeCSS(TARGET_CLASS)} {
    background: var(--se-accent-soft);
    outline: var(--se-border) solid var(--se-accent);
    outline-offset: calc(-1 * var(--se-border));
  }
`

// A column is where cards lie. The board fills it and tells it what to show.
export interface ColumnPlace extends HTMLElement {
  cardCount: number
}

export function isColumn(el: EventTarget): el is ColumnPlace {
  return el instanceof HTMLElement && el.tagName.toLowerCase() === COLUMN_TAG
}

export function isCard(el: EventTarget): el is HTMLElement {
  return el instanceof HTMLElement && el.tagName.toLowerCase() === CARD_TAG
}

function columnsOf(board: HTMLElement): ColumnPlace[] {
  return Array.from(board.children).filter(isColumn)
}

export function cardsOf(column: ColumnPlace): HTMLElement[] {
  return Array.from(column.children).filter(isCard)
}

function columnTitle(column: HTMLElement): string {
  return column.getAttribute('heading') ?? COLUMN_TITLE_STANDARD
}

// What the ERP holds for a column: its own value, or its title when it has none.
export function columnValue(column: HTMLElement): string {
  const value = (column.getAttribute('value') ?? '').trim()
  return value !== '' ? value : columnTitle(column)
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
function fallbackColumn(plan: BoardPlan): ColumnPlace {
  return plan.columns[plan.catchAll >= 0 ? plan.catchAll : 0]
}

export interface Placement {
  column: ColumnPlace
}

export function placementOf(plan: BoardPlan, row: unknown): Placement {
  const value = plan.field === '' ? '' : fieldRead(row, plan.field)
  const slot = slotWithValue(value, plan.values)
  return { column: slot >= 0 ? plan.columns[slot] : fallbackColumn(plan) }
}
