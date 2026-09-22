import { hasCapability, contractOf } from '../../core/block/capability'
import { blockTypeForTag } from '../../core/block/registry'
import { recordIndexOf } from '../../softengine/data'
import { runtimeSource } from '../../softengine/runtimeSources'
import { selectionRefind, giverIdOf, traitOf, rowsToSelection } from './selection'
import { holeDataPreamble, makeDataLink, sourceIdOf, type DataPreamble } from './source'
import { addRow, type Calculation } from '../../core/data/calculation'
import { asNumber } from './sorting'
import { columnWithKey, type Column } from './columns'

// Where a list takes its rows from: it reads them from its own data source, or
// another part of the mask hands them over (the lookup window does).
export type RowsFrom = 'source' | 'handed'

// A row handed over instead of read from a source: the record itself plus the
// text of each column.
export interface HandedRow {
  rawRow: unknown

  cells: readonly string[]
}

// What the last fill found. The list reads this to say why it shows no rows
// instead of leaving an empty box.
export interface RowsReport {
  delivered: boolean

  inSource: number
  afterDay: number
  afterSelection: number

  bySelection: boolean
}

export const WITHOUT_ROWS: RowsReport = {
  delivered: false,
  inSource: 0,
  afterDay: 0,
  afterSelection: 0,
  bySelection: false,
}

// The element a data source fills. It holds the rows and states what shapes
// them: its own columns and its own calculations.
export interface RowsElement extends HTMLElement {
  rawRows: unknown[]
  dataRows: string[][]
  rowsReport: RowsReport

  listColumns: () => readonly Column[]
  listCalculations: () => readonly Calculation[]
}

function checkArrival(el: HTMLElement, preamble: DataPreamble | null): void {
  if (!hasCapability(blockTypeForTag(el.tagName), 'holdsSent')) return
  contractOf(el, 'holdsSent').checkArrival(preamble === null ? null : {
    rows: preamble.rows,
    recordOf: (row) => recordIndexOf(preamble.source, row),
    read: preamble.read,
  })
}

export function rowComputed(
  columns: readonly Column[],
  calculations: readonly Calculation[],
  given: (slot: number) => string,
): string[] {
  const values = addRow(
    calculations,
    (key) => columnWithKey(columns, key),
    given,
    asNumber,
  )
  return columns.map((_, slot) => {
    const own = given(slot)
    return own !== '' ? own : values.get(slot)?.text ?? ''
  })
}

export function rowsIndexOf(el: HTMLElement, rawRow: unknown): string {
  const source = runtimeSource(sourceIdOf(el))
  return source ? recordIndexOf(source, rawRow) : ''
}

export function rowsTraitOf(el: HTMLElement, rawRow: unknown): string {
  if (rawRow == null) return ''
  const record = rowsIndexOf(el, rawRow)
  return record === '' ? traitOf(rawRow) : JSON.stringify([sourceIdOf(el), record])
}

export function hasRecordNumber(el: HTMLElement): boolean {
  const source = runtimeSource(sourceIdOf(el))
  return source !== undefined && source.recordField !== ''
}

function fillRows(el: RowsElement, delivery: boolean): void {
  const preamble = holeDataPreamble(el)

  if (delivery) checkArrival(el, preamble)
  if (!preamble) {
    el.rawRows = []
    el.dataRows = []
    el.rowsReport = WITHOUT_ROWS
    return
  }
  const columns = el.listColumns()
  const calculations = el.listCalculations()

  const { rows, filtered } = rowsToSelection(el, preamble.rows)

  selectionRefind(giverIdOf(el), rows, (r) => r, (r) => rowsTraitOf(el, r))

  const read = preamble.read

  el.rawRows = rows
  el.dataRows = rows.map((row) => rowComputed(
    columns,
    calculations,
    (slot) => {
      const field = columns[slot]?.field ?? ''
      return field === '' ? '' : read(row, field)
    },
  ))
  el.rowsReport = {
    delivered: true,
    inSource: preamble.inSource,
    afterDay: preamble.rows.length,
    afterSelection: rows.length,
    bySelection: filtered,
  }
}

const link = makeDataLink<RowsElement>({ hydrate: fillRows })

export const followSource = link.connect
export const unfollowSource = link.disconnect

export interface HandedCells {
  rawRows: unknown[]
  dataRows: string[][]
}

export function cellsForHandedRows(
  rows: readonly HandedRow[],
  columns: readonly Column[],
  calculations: readonly Calculation[],
): HandedCells {
  return {
    rawRows: rows.map((z) => z.rawRow),
    dataRows: rows.map((z) => rowComputed(columns, calculations, (slot) => z.cells[slot] ?? '')),
  }
}
