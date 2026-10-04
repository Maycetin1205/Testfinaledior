import type { Delivery, PendingKind, WrittenRow } from '../../core/block/capability'
import type { Calculation } from '../../core/data/calculation'
import type { Column } from '../list/columns'
import type { Entry } from '../lookup/lookup'
import type { KeyAction } from '../lookup/suggestionState'
import type { CaptureColumn } from './column'
import { BookedRows } from './ledger/bookedRows'
import { CaptureRow, type LookupSpot } from './ledger/captureRow'
import { CapturedRows, type PendingRow } from './ledger/capturedRows'
import { Outbound, type RowState } from './ledger/outbound'
import { captureContext, type CaptureContext } from './row'

export type { RowState } from './ledger/outbound'

interface CaptureHost {
  block: HTMLElement

  columns: () => readonly CaptureColumn[]

  // The columns the operator sees, by their place among all columns.
  shown: () => readonly number[]

  calculations: () => readonly Calculation[]

  sourceId: () => string

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void
}

// Everything the capture holds, in four parts: the capture row, the rows
// captured but not yet booked, the booked rows with their changes, and
// what is out with the document. The ledger hands each
// question to its part and joins them where the document answers.
export class CaptureLedger {
  private readonly host: CaptureHost

  private readonly outbound: Outbound

  private readonly row: CaptureRow

  private readonly captured: CapturedRows

  private readonly booked: BookedRows

  constructor(host: CaptureHost) {
    this.host = host
    const context = (): CaptureContext => captureContext(
      host.block,
      host.columns(),
      host.sourceId(),
      host.calculations(),
    )
    this.outbound = new Outbound(host.report)
    const status = this.outbound.shows.bind(this.outbound)
    this.row = new CaptureRow({ ...host, context })
    this.captured = new CapturedRows({ ...host, context }, this.row, status)
    this.booked = new BookedRows({ ...host, firstCell: () => this.row.firstCell }, status)
  }

  // ----- the capture row -----

  get typingColumn(): number { return this.row.typingColumn }

  get mark(): number { return this.row.mark }

  get suggestions(): readonly Entry[] { return this.row.suggestions }

  get firstCell(): number { return this.row.firstCell }

  rowView(): { value: string; automatic: boolean }[] { return this.row.rowView() }

  heldAt(index: number): boolean { return this.row.heldAt(index) }

  type(index: number, text: string): void { this.row.type(index, text) }

  leave(index: number): void { this.row.leave(index) }

  empty(index: number): void { this.row.empty(index) }

  setMark(mark: number): void { this.row.setMark(mark) }

  openList(index: number): void { this.row.openList(index) }

  decideKey(index: number, key: string): KeyAction { return this.row.decideKey(index, key) }

  neighbour(from: number, direction: 1 | -1): number { return this.row.neighbour(from, direction) }

  focusCell(index: number): void { this.host.focusCell(index) }

  lookupAt(index: number): LookupSpot | null { return this.row.lookupAt(index) }

  adoptSuggestion(index: number, listIndex: number): void { this.row.adoptSuggestion(index, listIndex) }

  adopt(index: number, record: unknown): void { this.row.adopt(index, record) }

  entriesFor(index: number): Entry[] { return this.row.entriesFor(index) }

  refresh(): void { this.row.refresh() }

  typedAt(index: number): string { return this.row.typedAt(index) }

  windowColumnsAt(index: number): Column[] { return this.row.windowColumnsAt(index) }

  // Enter and Tab go one column on; past the last one they capture the row.
  jumpFrom(index: number, key: string): boolean {
    this.row.settle(index)
    const next = this.row.neighbour(index, 1)
    if (next !== -1) {
      this.host.focusCell(next)
      return true
    }
    if (key !== 'Tab' && key !== 'Enter') return true
    return this.captured.captureRow()
  }

  // ----- the captured rows -----

  get capturedValues(): readonly (readonly string[])[] { return this.captured.values }

  get correctionSlot(): number | null { return this.captured.correctionSlot }

  pendingMarks(): PendingRow[] { return this.captured.pendingMarks() }

  capturedStatus(index: number): RowState { return this.captured.statusAt(index) }

  captureRow(): boolean { return this.captured.captureRow() }

  bringBackCaptured(index: number): void { this.captured.bringBack(index) }

  removeCaptured(index: number): void { this.captured.remove(index) }

  // ----- the booked rows -----

  get changedRows(): readonly { record: string; values: readonly string[] }[] { return this.booked.changedRows }

  statusOf(rawIndex: number): RowState { return this.booked.statusOf(rawIndex) }

  isChanged(rawIndex: number, columnsIndex: number): boolean { return this.booked.isChanged(rawIndex, columnsIndex) }

  cellValue(rawIndex: number, columnsIndex: number): string { return this.booked.cellValue(rawIndex, columnsIndex) }

  typeCell(rawIndex: number, columnsIndex: number, text: string): void { this.booked.typeCell(rawIndex, columnsIndex, text) }

  leaveCell(rawIndex: number, columnsIndex: number, text: string): void { this.booked.leaveCell(rawIndex, columnsIndex, text) }

  keyCell(rawIndex: number, columnsIndex: number, e: KeyboardEvent): void { this.booked.keyCell(rawIndex, columnsIndex, e) }

  // ----- what is out with the document -----

  writes(kind: PendingKind, key: string): void { this.outbound.writes(kind, key) }

  failed(kind: PendingKind, key: string): void { this.outbound.failed(kind, key) }

  // A run is through: captured rows carry their record now, changes wait
  // for the document to show them.
  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    const keys = written.map((z) => z.key)
    this.outbound.done(kind, keys)
    if (kind === 'captured') {
      if (this.captured.markWritten(written)) this.host.report()
      return
    }
    this.booked.takeOut(keys)
  }

  // ----- the answer of the document -----

  checkArrival(delivery: Delivery | null): void {
    if (delivery === null) {
      if (!this.captured.hasWritten() && !this.booked.hasInFlight()) return
      this.captured.dropWritten()
      this.booked.dropInFlight()
      this.host.report()
      return
    }
    const captured = this.captured.arrival(delivery)
    const booked = this.booked.arrival(delivery)
    for (const key of captured.missing) this.outbound.failed('captured', key)
    for (const record of booked.missing) this.outbound.failed('changed', record)

    if (captured.moved || booked.moved) this.host.report()
  }
}
