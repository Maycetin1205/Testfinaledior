import type { Column } from './columns'
import type { RowsFrom } from './sourceRows'

export interface ListShowQuestion {
  inEditor: boolean

  rowsFrom: RowsFrom

  sourceId: string

  columns: readonly Column[]

  rowCount: number
}

export interface ListShows {
  // False in the editor: there the list draws placeholder rows, not data.
  rows: boolean

  empty: boolean
}

// Rows of blanks are as empty as no rows at all.
export function listEmptyState(question: ListShowQuestion): ListShows {
  const sourceId = question.sourceId.trim()
  const rows = !question.inEditor && (question.rowsFrom === 'handed' || sourceId !== '')
  if (!rows) return { rows: false, empty: false }

  const anyColumnBound = question.columns.some((column) => column.field.trim() !== '')
  const empty = question.rowCount === 0
    || (question.rowsFrom === 'source' && !anyColumnBound)
  return { rows: true, empty }
}
