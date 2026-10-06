import type { PendingKind } from '../../../core/block/capability'
import { columnSlots, rowValues, type Calculation } from '../../../core/data/calculation'
import { asNumber } from '../../../core/data/number'
import { columnWithKey } from '../../list/columns'
import { rowsIndexOf } from '../../list/sourceRows'
import { cellsFields, enterCell } from '../cells'
import type { CaptureColumn } from '../column'
import type { RowState, RowsStatus } from './outbound'
import {
  cellIn,
  dropCell,
  dropRecord,
  hasRecordIn,
  recordsIn,
  setCell,
  type Cells,
} from './recordCells'

const BOOKED_ROWS = '.body > .row:not(.capture)'

interface BookedRowsHost {
  block: HTMLElement

  columns: () => readonly CaptureColumn[]

  calculations: () => readonly Calculation[]

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  focusCell: (index: number) => void

  // The first cell of the capture row the operator sees.
  firstCell: () => number
}

type Status = (kind: PendingKind, key: string, base: RowsStatus) => RowState

// The same value, also as a number: "3" and "3,00".
function valueEquals(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x === y) return true
  const number = asNumber(x)
  return number !== null && number === asNumber(y)
}

// The booked rows of the document: the cells changed in them, and what of
// that is out with the document.
export class BookedRows {
  private readonly host: BookedRowsHost

  private readonly status: Status

  private readonly changes: Cells = new Map()

  private readonly sent: Cells = new Map()

  constructor(host: BookedRowsHost, status: Status) {
    this.host = host
    this.status = status
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this.rowsOf(recordsIn(this.changes))
  }

  private rowsOf(records: readonly string[]): { record: string; values: readonly string[] }[] {
    if (records.length === 0) return []
    const columnsCount = this.host.columns().length
    const slots = this.recordSlots()
    const out: { record: string; values: readonly string[] }[] = []
    for (const record of records) {
      const rawIndex = slots.get(record)

      if (rawIndex === undefined) continue
      out.push({
        record,
        values: Array.from({ length: columnsCount }, (_, column) => this.cellValue(rawIndex, column)),
      })
    }
    return out
  }

  private recordSlots(): Map<string, number> {
    const slots = new Map<string, number>()
    this.host.rawRows().forEach((row, index) => {
      const record = rowsIndexOf(this.host.block, row)
      if (record !== '' && !slots.has(record)) slots.set(record, index)
    })
    return slots
  }

  private recordOf(rawIndex: number): string {
    const rawRow = this.host.rawRows()[rawIndex]
    return rawRow === undefined ? '' : rowsIndexOf(this.host.block, rawRow)
  }

  statusOf(rawIndex: number): RowState {
    const record = this.recordOf(rawIndex)
    if (record === '') return { status: 'booked' }
    const columns = this.host.columns()
    if (columns.some((_, column) => cellIn(this.changes, record, column) !== undefined)) {
      return this.status('changed', record, 'changed')
    }
    const inFlight = columns.some((_, column) => cellIn(this.sent, record, column) !== undefined)
    return this.status('changed', record, inFlight ? 'written' : 'booked')
  }

  isChanged(rawIndex: number, columnsIndex: number): boolean {
    const record = this.recordOf(rawIndex)
    return cellIn(this.changes, record, columnsIndex) !== undefined
      || cellIn(this.sent, record, columnsIndex) !== undefined
  }

  cellValue(rawIndex: number, columnsIndex: number): string {
    const record = this.recordOf(rawIndex)
    const pending = cellIn(this.changes, record, columnsIndex)
    if (pending !== undefined) return pending

    const inFlight = cellIn(this.sent, record, columnsIndex)
    if (inFlight !== undefined) return inFlight
    const computed = this.computedCell(rawIndex, record, columnsIndex)
    if (computed !== null) return computed
    return this.host.dataRows()[rawIndex]?.[columnsIndex] ?? ''
  }

  private computedCell(
    rawIndex: number,
    record: string,
    columnsIndex: number,
  ): string | null {
    if (this.changes.size === 0 && this.sent.size === 0) return null
    if (!hasRecordIn(this.changes, record) && !hasRecordIn(this.sent, record)) return null
    const calculations = this.host.calculations()
    const columns = this.host.columns()
    const slotOf = (key: string): number => columnWithKey(columns, key)
    if (!columnSlots(calculations, slotOf).has(columnsIndex)) return null
    // A change in the row computes the lead of the sentence anew.
    const leadSlots = new Set(calculations.map((b) => slotOf(b.lead)))
    const row = this.host.dataRows()[rawIndex]
    const computed = rowValues(calculations, slotOf, (slot) => {
      const own = cellIn(this.changes, record, slot) ?? cellIn(this.sent, record, slot)
      return own ?? (leadSlots.has(slot) ? '' : row?.[slot] ?? '')
    })
    return computed.get(columnsIndex) ?? null
  }

  typeCell(rawIndex: number, columnsIndex: number, text: string): void {
    const record = this.recordOf(rawIndex)
    if (record === '') return
    if (setCell(this.changes, record, columnsIndex, text)) this.host.report()
  }

  leaveCell(rawIndex: number, columnsIndex: number, text: string): void {
    const record = this.recordOf(rawIndex)
    const inFlight = cellIn(this.sent, record, columnsIndex)
    if (inFlight !== undefined) {
      if (text === inFlight) return
      dropCell(this.sent, record, columnsIndex)
      if (setCell(this.changes, record, columnsIndex, text)) this.host.report()
      return
    }
    const original = this.host.dataRows()[rawIndex]?.[columnsIndex] ?? ''
    const changed = text === original
      ? dropCell(this.changes, record, columnsIndex)
      : setCell(this.changes, record, columnsIndex, text)
    if (changed) this.host.report()
  }

  keyCell(rawIndex: number, columnsIndex: number, e: KeyboardEvent): void {
    const field = e.target as HTMLInputElement

    if (e.key === 'F5') {
      e.preventDefault()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (dropCell(this.changes, this.recordOf(rawIndex), columnsIndex)) {
        this.host.report()
      }
      return
    }
    const steps: Record<string, number> = {
      Enter: 1,
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 10,
      PageUp: -10,
    }
    const step = steps[e.key]
    if (step === undefined) return
    e.preventDefault()
    e.stopPropagation()
    this.cellNeighbour(columnsIndex, field, step, e.key === 'Enter')
  }

  private cellNeighbour(
    columnsIndex: number,
    of: HTMLInputElement,
    step: number,
    enterMode: boolean,
  ): void {
    const fields = cellsFields(this.host.block.shadowRoot, BOOKED_ROWS, columnsIndex)
    const now = fields.indexOf(of)
    if (now < 0) return
    let target = now + step
    if (target > fields.length - 1) {
      if (enterMode) {
        this.host.focusCell(this.host.firstCell())
        return
      }
      target = fields.length - 1
    }
    if (target < 0) target = 0
    const field = fields[target]
    if (field === of) return
    enterCell(field)
  }

  // A written row leaves the pending marks and waits for the document to show
  // it.
  takeOut(keys: readonly string[]): void {
    let away = false
    const slots = this.recordSlots()
    for (const record of keys) {
      const rawIndex = slots.get(record)
      this.host.columns().forEach((_, column) => {
        const value = cellIn(this.changes, record, column)
        if (value === undefined) return
        const before = rawIndex === undefined
          ? ''
          : this.host.dataRows()[rawIndex]?.[column] ?? ''

        if (valueEquals(value, before)) return
        setCell(this.sent, record, column, value)
      })
      away = dropRecord(this.changes, record) || away
    }
    if (away) this.host.report()
  }

  hasInFlight(): boolean {
    return this.sent.size > 0
  }

  // The document delivered anew or closed: nothing waits any more.
  dropInFlight(): void {
    this.sent.clear()
  }
}
