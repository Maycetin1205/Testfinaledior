import { contractOf } from '../../core/block/registry'
import { maskState } from '../../runtime/maskState'
import { relocateSelection, giverIdOf, traitOf, rowsToSelection } from '../../runtime/selection'
import {
  readDataPreamble,
  makeDataLink,
  recordOf,
  sourceIdOf,
  type DataPreamble,
} from '../../runtime/source'
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

export interface RowsElement extends HTMLElement {
  rawRows: unknown[]
  dataRows: string[][]

  listColumns: () => readonly Column[]
  listCalculations: () => readonly Calculation[]
}

function checkArrival(el: HTMLElement, preamble: DataPreamble | null): void {
  contractOf(el, 'holdsSent')?.checkArrival(preamble === null ? null : {
    rows: preamble.rows,
    recordOf: (row) => recordOf(preamble.source, row),
    read: preamble.read,
  })
}

function rowComputed(
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
  const source = maskState.host.source(sourceIdOf(el))
  return source ? recordOf(source, rawRow) : ''
}

export function rowsTraitOf(el: HTMLElement, rawRow: unknown): string {
  if (rawRow == null) return ''
  const record = rowsIndexOf(el, rawRow)
  return record === '' ? traitOf(rawRow) : JSON.stringify([sourceIdOf(el), record])
}

export function hasRecordNumber(el: HTMLElement): boolean {
  const source = maskState.host.source(sourceIdOf(el))
  return source !== undefined && source.recordField !== ''
}

function fillRows(el: RowsElement, delivery: boolean): void {
  const preamble = readDataPreamble(el)

  if (delivery) checkArrival(el, preamble)
  if (!preamble) {
    el.rawRows = []
    el.dataRows = []
    return
  }
  const columns = el.listColumns()
  const calculations = el.listCalculations()

  const rows = rowsToSelection(el, preamble.rows)

  relocateSelection(giverIdOf(el), rows, (r) => r, (r) => rowsTraitOf(el, r))

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
}

const link = makeDataLink<RowsElement>({ hydrate: fillRows })

export const followSource = link.connect
export const unfollowSource = link.disconnect

interface HandedCells {
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
