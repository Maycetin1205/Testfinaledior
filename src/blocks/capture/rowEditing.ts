import type { Delivery, PendingKind } from '../../core/block/capability'
import { booleanProperty, type Property } from '../../core/block/property'
import { walkInCell, cellsFields } from './cells'
import { addRow, resultSlots, type Calculation } from '../../core/data/calculation'
import { rowsIndexOf } from '../behavior/sourceRows'
import { asNumber } from '../behavior/sorting'
import { columnWithKey, type Column } from '../behavior/columns'
import {
  changeArrived,
  deletionArrived,
  notChangedMessage,
  notDeletedMessage,
  valueEquals,
  type MissingRow,
} from './arrival'
import type { RunState, RowsIcon } from './rowStatus'

const BOOKED_ROWS = '.koerper > .zeile:not(.erfassung)'

export function deletableProperty(): Property<boolean> {
  return booleanProperty({
    default: false,
    label: 'Zeilen löschbar',
    help: 'Kreuz an jeder Zeile: merkt sie zum Löschen vor.',
    attribute: 'deletable',
    needsSource: true,
  })
}

export interface RowsHost {
  block: HTMLElement

  columns: () => readonly Column[]

  calculations: () => readonly Calculation[]

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  run: RunState

  focusCaptureCell: (index: number) => void
}

export interface RowsArrival {
  changeMissing: readonly string[]

  deletionMissing: readonly string[]

  message: string

  moved: boolean
}

const NOTHING_IN_FLIGHT: RowsArrival = {
  changeMissing: [],
  deletionMissing: [],
  message: '',
  moved: false,
}

export class RowsEditing {
  private readonly host: RowsHost

  private readonly changes = new ChangeStorage()

  private readonly deleted = new Set<string>()

  private readonly sent = new ChangeStorage()

  private readonly previous = new ChangeStorage()

  private readonly sentDeletion = new Set<string>()

  constructor(host: RowsHost) {
    this.host = host
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    if (this.changes.count === 0) return []
    const columnsCount = this.host.columns().length
    const slots = this.recordSlots()
    const out: { record: string; values: readonly string[] }[] = []
    for (const record of this.changes.records()) {
      const rawIndex = slots.get(record)

      if (rawIndex === undefined) continue
      out.push({
        record,
        values: Array.from({ length: columnsCount }, (_, column) => this.cellValue(rawIndex, column)),
      })
    }
    return out
  }

  get deletedRows(): readonly { record: string; values: readonly string[] }[] {
    if (this.deleted.size === 0) return []
    const columnsCount = this.host.columns().length
    const slots = this.recordSlots()
    const out: { record: string; values: readonly string[] }[] = []
    for (const record of this.deleted) {
      const rawIndex = slots.get(record)
      if (rawIndex === undefined) continue
      out.push({
        record,
        values: Array.from({ length: columnsCount }, (_, column) => this.cellValue(rawIndex, column)),
      })
    }
    return out
  }

  remove(kind: PendingKind, keys: readonly string[]): void {
    let away = false
    const slots = kind === 'changed' ? this.recordSlots() : undefined
    for (const record of keys) {
      if (kind === 'changed') {
        const rawIndex = slots?.get(record)
        this.host.columns().forEach((_, column) => {
          const value = this.changes.value(record, column)
          if (value === undefined) return
          const before = rawIndex === undefined
            ? ''
            : this.host.dataRows()[rawIndex]?.[column] ?? ''

          if (valueEquals(value, before)) return
          this.sent.set(record, column, value)
          this.previous.set(record, column, before)
        })
        away = this.changes.takeRecordBack(record) || away
      } else if (this.deleted.delete(record)) {
        this.sentDeletion.add(record)
        away = true
      }
    }
    if (away) this.host.report()
  }

  private forgetWaiting(record: string): void {
    this.sent.takeRecordBack(record)
    this.previous.takeRecordBack(record)
  }

  checkArrival(delivery: Delivery | null): RowsArrival {
    if (this.sent.count === 0 && this.sentDeletion.size === 0) {
      return NOTHING_IN_FLIGHT
    }

    if (delivery === null) {
      this.sent.empty()
      this.previous.empty()
      this.sentDeletion.clear()
      return { ...NOTHING_IN_FLIGHT, moved: true }
    }

    const slots = this.recordSlots()

    const deletionMissing: string[] = []
    const deletedReported: MissingRow[] = []
    for (const record of this.sentDeletion) {
      if (deletionArrived(record, delivery)) continue
      deletionMissing.push(record)
      deletedReported.push({ nr: record, item: this.itemOf(slots.get(record)) })
    }
    this.sentDeletion.clear()
    for (const record of deletionMissing) this.deleted.add(record)

    const changeMissing: string[] = []
    const changedReported: MissingRow[] = []
    for (const record of this.sent.records()) {
      if (this.deleted.has(record)) {
        this.forgetWaiting(record)
        continue
      }
      if (changeArrived(record, this.sentCells(record), delivery)) {
        this.forgetWaiting(record)
        continue
      }
      changeMissing.push(record)
      changedReported.push({ nr: record, item: this.itemOf(slots.get(record)) })
    }

    for (const record of changeMissing) {
      this.host.columns().forEach((_, column) => {
        const value = this.sent.value(record, column)
        if (value !== undefined && this.changes.value(record, column) === undefined) {
          this.changes.set(record, column, value)
        }
      })
      this.forgetWaiting(record)
    }

    const message = [
      notChangedMessage(changedReported),
      notDeletedMessage(deletedReported),
    ].filter((text) => text !== '').join(' ')
    return { changeMissing, deletionMissing, message, moved: true }
  }

  private sentCells(record: string): { field: string; before: string }[] {
    const out: { field: string; before: string }[] = []
    this.host.columns().forEach((column, index) => {
      if (this.sent.value(record, index) === undefined || column.field === '') return
      out.push({ field: column.field, before: this.previous.value(record, index) ?? '' })
    })
    return out
  }

  private itemOf(rawIndex: number | undefined): string {
    if (rawIndex === undefined) return ''
    return this.host.columns()
      .map((_, column) => this.cellValue(rawIndex, column))
      .find((value) => value.trim() !== '') ?? ''
  }

  statusOf(rawIndex: number): RowsIcon {
    const record = this.recordOf(rawIndex)
    if (record === '') return { status: 'booked', title: '' }
    if (this.deleted.has(record)) return this.host.run.shows('deleted', record, 'deletion')
    if (this.sentDeletion.has(record)) {
      return this.host.run.shows('deleted', record, 'written')
    }
    const columns = this.host.columns()
    if (columns.some((_, column) => this.changes.value(record, column) !== undefined)) {
      return this.host.run.shows('changed', record, 'changed')
    }
    const inFlight = columns.some((_, column) => this.sent.value(record, column) !== undefined)
    return this.host.run.shows('changed', record, inFlight ? 'written' : 'booked')
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

  toggleDeletion(rawIndex: number): void {
    const record = this.recordOf(rawIndex)
    if (record === '') return
    if (this.deleted.has(record)) this.deleted.delete(record)

    else if (this.sentDeletion.has(record)) this.sentDeletion.delete(record)
    else {
      this.deleted.add(record)
      this.host.columns().forEach((_, column) => {
        this.changes.takeBack(record, column)
      })

      this.forgetWaiting(record)
    }
    this.host.report()
  }

  isDeleted(rawIndex: number): boolean {
    const record = this.recordOf(rawIndex)
    return record !== '' && (this.deleted.has(record) || this.sentDeletion.has(record))
  }

  cellValue(rawIndex: number, columnsIndex: number): string {
    const record = this.recordOf(rawIndex)
    const pending = this.changes.value(record, columnsIndex)
    if (pending !== undefined) return pending

    const inFlight = this.sent.value(record, columnsIndex)
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
    if (this.changes.count === 0 && this.sent.count === 0) return null
    if (!this.changes.hasRecord(record) && !this.sent.hasRecord(record)) return null
    const calculations = this.host.calculations()
    const columns = this.host.columns()
    const slotOf = (key: string): number => columnWithKey(columns, key)
    if (!resultSlots(calculations, slotOf).has(columnsIndex)) return null
    const leadSlots = new Set(calculations.map((b) => slotOf(b.lead.column)))
    const row = this.host.dataRows()[rawIndex]
    const computed = addRow(
      calculations,
      slotOf,
      (slot) => {
        const own = this.changes.value(record, slot) ?? this.sent.value(record, slot)

        return own ?? (leadSlots.has(slot) ? '' : row?.[slot] ?? '')
      },
      asNumber,
    )
    return computed.get(columnsIndex)?.text ?? null
  }

  isChanged(rawIndex: number, columnsIndex: number): boolean {
    const record = this.recordOf(rawIndex)
    return this.changes.value(record, columnsIndex) !== undefined
      || this.sent.value(record, columnsIndex) !== undefined
  }

  typeCell(rawIndex: number, columnsIndex: number, text: string): void {
    if (this.changes.set(this.recordOf(rawIndex), columnsIndex, text)) {
      this.host.report()
    }
  }

  leaveCell(rawIndex: number, columnsIndex: number, text: string): void {
    const record = this.recordOf(rawIndex)
    const inFlight = this.sent.value(record, columnsIndex)
    if (inFlight !== undefined) {
      if (text === inFlight) return
      this.sent.takeBack(record, columnsIndex)
      this.previous.takeBack(record, columnsIndex)
      if (this.changes.set(record, columnsIndex, text)) this.host.report()
      return
    }
    const original = this.host.dataRows()[rawIndex]?.[columnsIndex] ?? ''
    const changed = text === original
      ? this.changes.takeBack(record, columnsIndex)
      : this.changes.set(record, columnsIndex, text)
    if (changed) this.host.report()
  }

  private cellNeighbour(
    columnsIndex: number,
    of: HTMLInputElement,
    step: number,
    enterMode: boolean,
  ): void {
    const fields = cellsFields(
      this.host.block.shadowRoot,
      BOOKED_ROWS,
      columnsIndex,
    )
    const now = fields.indexOf(of)
    if (now < 0) return
    let target = now + step
    if (target > fields.length - 1) {
      if (enterMode) {
        this.host.focusCaptureCell(0)
        return
      }
      target = fields.length - 1
    }
    if (target < 0) target = 0
    const field = fields[target]
    if (field === of) return
    walkInCell(field)
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
      if (this.changes.takeBack(this.recordOf(rawIndex), columnsIndex)) {
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
}

const DIVIDER = '\u0000'

function key(record: string, column: number): string {
  return record + DIVIDER + String(column)
}

export class ChangeStorage {
  private values = new Map<string, string>()

  set(record: string, column: number, value: string): boolean {
    if (record === '') return false
    const k = key(record, column)
    if (this.values.get(k) === value) return false
    this.values.set(k, value)
    return true
  }

  takeBack(record: string, column: number): boolean {
    return this.values.delete(key(record, column))
  }

  value(record: string, column: number): string | undefined {
    return record === '' ? undefined : this.values.get(key(record, column))
  }

  get count(): number {
    return this.values.size
  }

  empty(): void {
    this.values.clear()
  }

  records(): string[] {
    const out: string[] = []
    for (const k of this.values.keys()) {
      const record = k.slice(0, k.indexOf(DIVIDER))
      if (!out.includes(record)) out.push(record)
    }
    return out
  }

  hasRecord(record: string): boolean {
    if (record === '') return false
    const start = record + DIVIDER
    for (const k of this.values.keys()) if (k.startsWith(start)) return true
    return false
  }

  takeRecordBack(record: string): boolean {
    let away = false
    for (const k of [...this.values.keys()]) {
      if (k.slice(0, k.indexOf(DIVIDER)) === record && this.values.delete(k)) away = true
    }
    return away
  }
}
