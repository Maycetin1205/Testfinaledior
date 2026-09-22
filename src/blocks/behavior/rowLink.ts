import { capability, hasCapability, contractOf } from '../../core/block/capability'
import { blockTypeForTag } from '../../core/block/registry'
import { recordIndexOf } from '../../softengine/data'
import { runtimeSource } from '../../softengine/runtimeSources'
import { selectionRefind, giverIdOf, traitOf, rowsToSelection } from './selection'
import { holeDataPreamble, makeDataLink, sourceIdOf, type DataPreamble } from './source'
import { calculationsFrom, addRow, type Calculation } from '../../core/data/calculation'
import { asNumber } from './sorting'
import { columnWithKey, tryCoerceColumns, type Column } from './columns'

export interface RuntimeTableElement extends HTMLElement {
  dataRows: string[][]
  rawRows: unknown[]
  bySelectionFiltered: boolean
  dataDelivered: boolean
}

function checkArrival(el: HTMLElement, preamble: DataPreamble | null): void {
  if (!hasCapability(blockTypeForTag(el.tagName), 'holdsSent')) return
  contractOf(el, 'holdsSent').checkArrival(preamble === null ? null : {
    rows: preamble.rows,
    recordOf: (row) => recordIndexOf(preamble.source, row),
    read: preamble.read,
  })
}

function columnsOf(el: HTMLElement): Column[] {
  return tryCoerceColumns(el.getAttribute('columns') ?? '')
}

function calculationsOf(el: HTMLElement): Calculation[] {
  const prop = capability(blockTypeForTag(el.tagName), 'compute')?.prop
  return prop === undefined ? [] : calculationsFrom((el as unknown as Record<string, unknown>)[prop])
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

function hydrateTable(el: RuntimeTableElement, delivery: boolean): void {
  const preamble = holeDataPreamble(el)

  if (delivery) checkArrival(el, preamble)
  if (!preamble) {
    el.dataRows = []
    return
  }
  const columns = columnsOf(el)
  const calculations = calculationsOf(el)

  const { rows, filtered } = rowsToSelection(el, preamble.rows)

  selectionRefind(giverIdOf(el), rows, (r) => r, (r) => rowsTraitOf(el, r))

  const read = preamble.read

  el.dataDelivered = true
  el.rawRows = rows
  el.bySelectionFiltered = filtered
  el.dataRows = rows.map((row) => rowComputed(
    columns,
    calculations,
    (slot) => {
      const field = columns[slot]?.field ?? ''
      return field === '' ? '' : read(row, field)
    },
  ))
}

const link = makeDataLink<RuntimeTableElement>({ hydrate: hydrateTable })

export const connectTable = link.connect
export const disconnectTable = link.disconnect

export type DataOwnership = 'softengine' | 'provided'

export interface ProvidedRow {
  rawRow: unknown

  cells: readonly string[]
}

export interface DerivedRows {
  rawRows: unknown[]
  dataRows: string[][]
}

export function deriveRowsOff(
  rows: readonly ProvidedRow[],
  columns: readonly Column[],
  calculations: readonly Calculation[],
): DerivedRows {
  return {
    rawRows: rows.map((z) => z.rawRow),
    dataRows: rows.map((z) => rowComputed(columns, calculations, (slot) => z.cells[slot] ?? '')),
  }
}
