import { maskState } from '../../runtime/maskState'
import type { KanbanColumn, KanbanPlace } from './columns'

// A place of a column, where a card lies.
export interface Spot {
  column: number
  place: number
}

export const sameSpot = (a: Spot, b: Spot): boolean => a.column === b.column && a.place === b.place

// What the ERP holds for a place: its own value, else the title of a column
// with this one place, else the place's name.
export function placeValue(column: KanbanColumn, place: KanbanPlace): string {
  const value = place.value.trim()
  if (value !== '') return value
  return column.places.length === 1 ? column.heading : place.name
}

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

// Where a record lies: at the place that names its value, else at the first
// place of the catch-all column, else at the very first place.
export function spotOf(columns: readonly KanbanColumn[], field: string, row: unknown): Spot {
  const value = field === '' ? '' : maskState.host.readField(row, field)
  if (value.trim() !== '') {
    for (const [c, column] of columns.entries()) {
      const p = column.places.findIndex((place) => same(placeValue(column, place), value))
      if (p >= 0) return { column: c, place: p }
    }
  }
  return { column: Math.max(0, columns.findIndex((c) => c.catchAll)), place: 0 }
}
