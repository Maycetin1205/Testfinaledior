import { maskState } from '../../runtime/maskState'
import type { KanbanColumn } from './columns'

// What the ERP holds for a column: its own value, or its title when it has none.
export function columnValue(column: KanbanColumn): string {
  const value = column.value.trim()
  return value !== '' ? value : column.heading
}

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

// Where a record lies: in the column that names its value, else in the
// catch-all column, else in the first.
export function columnOf(columns: readonly KanbanColumn[], field: string, row: unknown): number {
  const value = field === '' ? '' : maskState.host.readField(row, field)
  const named = value.trim() === '' ? -1 : columns.findIndex((c) => same(columnValue(c), value))
  if (named >= 0) return named
  return Math.max(0, columns.findIndex((c) => c.catchAll))
}
