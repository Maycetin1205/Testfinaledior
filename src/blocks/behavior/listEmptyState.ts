import { runtimeSource } from '../../softengine/runtimeSources'
import type { Column } from './columns'
import type { RowsFrom, RowsReport } from './sourceRows'

export interface ListShowQuestion {
  inEditor: boolean

  rowsFrom: RowsFrom

  sourceId: string

  columns: readonly Column[]

  rowCount: number

  report: RowsReport

  // The text the builder set for a source that simply has no records.
  emptyText: string
}

export interface ListShows {
  // False in the editor: there the list draws placeholder rows, not data.
  rows: boolean

  empty: boolean

  text: string
}

const WITHOUT_SOURCE = 'Dieser Tabelle ist keine Datenquelle zugewiesen.'

const UNKNOWN_SOURCE = 'Die Datenquelle dieser Tabelle gibt es in dieser Maske nicht.'

const WITHOUT_BOUND_COLUMN = 'Keine Spalte dieser Tabelle ist an ein Feld gebunden.'

// The operator reads why the list stays empty, never an empty box. Only the
// last case is ordinary; there the builder's own text has the say.
function noRowsReason(
  sourceId: string,
  report: RowsReport,
  anyColumnBound: boolean,
  emptyText: string,
): string {
  if (sourceId === '') return WITHOUT_SOURCE

  const source = runtimeSource(sourceId)
  if (source === undefined) return UNKNOWN_SOURCE

  if (!report.delivered) {
    return `Die Datenquelle „${source.name}“ hat noch keine Daten geliefert.`
  }
  if (report.inSource > 0 && report.afterDay === 0) {
    return `Am gewählten Tag steht kein Satz aus „${source.name}“.`
  }
  if (report.afterDay > 0 && report.afterSelection === 0) {
    return `Zur gewählten Zeile gibt es keinen Satz aus „${source.name}“.`
  }
  if (report.afterSelection > 0 && !anyColumnBound) return WITHOUT_BOUND_COLUMN
  return emptyText
}

// Rows of blanks are as empty as no rows at all: a list whose columns read
// nothing out of a record shows the reason instead.
export function listEmptyState(question: ListShowQuestion): ListShows {
  const sourceId = question.sourceId.trim()
  const rows = !question.inEditor && (question.rowsFrom === 'handed' || sourceId !== '')
  if (!rows) return { rows: false, empty: false, text: question.emptyText }

  const anyColumnBound = question.columns.some((column) => column.field.trim() !== '')
  const empty = question.rowCount === 0
    || (question.rowsFrom === 'source' && !anyColumnBound)
  if (!empty) return { rows: true, empty: false, text: question.emptyText }

  return {
    rows: true,
    empty: true,
    text: question.rowsFrom === 'handed'
      ? question.emptyText
      : noRowsReason(sourceId, question.report, anyColumnBound, question.emptyText),
  }
}
