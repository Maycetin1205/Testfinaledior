import {
  rulerTicks,
  WITHOUT_MEASUREMENT,
  placeholderRows,
  scrollSplit,
  pagesSplit,
  ROWS_HEIGHT,
  type RowMetrics,
} from './pageSize'
import { sortIndizes, TOTAL_NACHKOMMA, totalText } from './sorting'
import { columnsRaster, type Column, type ColumnsRaster } from './columns'
import { rowFits } from './textSearch'

export interface ViewQuestion {
  columns: readonly Column[]

  rendered?: readonly Column[]
  slots?: readonly number[]

  widthOf?: (index: number) => number | undefined

  // False in the editor: there the list draws placeholder rows, not data.
  showsRows: boolean

  empty: boolean

  dataRows: readonly string[][]
  searchText: string

  sortColumn: number
  sortOn: boolean

  wishPage: number

  measured: RowMetrics | null

  takenRows: number

  valueAt: (rawIndex: number, column: number) => string

  paging: boolean
}

export interface TableRenderModel {
  cols: ColumnsRaster

  tick: number

  rowsHeight: number
  showsRows: boolean
  empty: boolean

  total: number
  pageCount: number
  page: number

  rows: readonly (number | null)[]

  rulerTicks: number | null

  totals: readonly { title: string; text: string }[]
}

function totalsOf(
  question: ViewQuestion,
  visible: readonly number[],
): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = []
  question.columns.forEach((column, i) => {
    if (column.total !== true) return
    const text = totalText(
      visible.map((row) => question.valueAt(row, i)),
      TOTAL_NACHKOMMA.min,
      TOTAL_NACHKOMMA.max,
    )
    if (text !== '') out.push({ title: column.title, text })
  })
  return out
}

function viewRows(question: ViewQuestion): string[][] {
  return question.dataRows.map((_, row) => question.columns.map((__, s) => question.valueAt(row, s)))
}

function visibleIndizes(question: ViewQuestion): number[] {
  const rows = viewRows(question)
  const filtered = fittingIndizes(rows, question.searchText)
  if (question.sortColumn < 0) return filtered
  const sortRows = filtered.map((i) => rows[i])
  return sortIndizes(sortRows, question.sortColumn, question.sortOn).map((k) => filtered[k])
}

export function tableRenderModel(question: ViewQuestion): TableRenderModel {
  const rendered = question.rendered ?? question.columns
  const slots = question.slots ?? rendered.map((_, i) => i)
  const cols: ColumnsRaster = {
    gridTemplateColumns: columnsRaster(rendered, (j) => question.widthOf?.(slots[j] ?? j)),
  }

  const tick = ROWS_HEIGHT
  const rowsHeight = question.measured?.rowsHeight ?? tick

  const showsRows = question.showsRows

  const empty = question.takenRows > 0 ? false : question.empty

  const allVisible = visibleIndizes(question)

  const taken = question.takenRows
  const measuredFit = question.measured === null
    ? null
    : Math.max(1, question.measured.fit - taken)
  const perPage = measuredFit ?? Math.max(1, WITHOUT_MEASUREMENT - taken)

  const free = question.measured === null ? null : Math.max(0, question.measured.fit - taken)
  const splitQuestion = {
    visible: allVisible,
    showsRows,
    perPage,
    wishPage: question.wishPage,
    placeholderRows: placeholderRows(free),
  }
  const { pages, page, rows } = question.paging
    ? pagesSplit(splitQuestion)
    : scrollSplit(splitQuestion)
  return {
    cols,
    tick,
    rowsHeight,
    showsRows,
    empty,
    total: allVisible.length,
    pageCount: pages,
    page,
    rows,

    rulerTicks: rulerTicks(free, rows.length),

    totals: totalsOf(question, allVisible),
  }
}

function fittingIndizes(
  rows: readonly (readonly string[])[],
  searchText: string,
): number[] {
  const out: number[] = []
  rows.forEach((z, i) => {
    if (rowFits(z, searchText)) out.push(i)
  })
  return out
}

export function recordText(args: {
  showsRows: boolean
  visible: number
  total: number
  searchesActive: boolean
  selectionActive?: boolean
}): string {
  if (!args.showsRows) return '— Datensätze'
  const extra = args.selectionActive ? ' · durch Auswahl gefiltert' : ''

  const word = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätze')
  const wordDative = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätzen')
  if (!args.searchesActive) {
    return (args.total === 0 ? 'Keine Datensätze' : `${args.total} ${word(args.total)}`) + extra
  }
  if (args.visible === 0) return `Kein Treffer von ${args.total} ${wordDative(args.total)}` + extra
  return `${args.visible} von ${args.total} ${wordDative(args.total)}` + extra
}
