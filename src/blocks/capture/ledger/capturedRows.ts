import type { Delivery, PendingKind, WrittenRow } from '../../../core/block/capability'
import { arrivalCheck } from '../arrival'
import type { CaptureColumn } from '../column'
import { missingRequired, type CaptureContext } from '../row'
import type { CaptureRow, Helpers } from './captureRow'
import type { RowState, RowsStatus } from './outbound'

type CapturedRow = Helpers & {
  key: string

  values: string[]

  written?: { record: string }
}

export interface PendingRow {
  key: string

  values: readonly string[]
}

interface CapturedRowsHost {
  context: () => CaptureContext

  columns: () => readonly CaptureColumn[]

  // The columns the operator sees, by their place among all columns.
  shown: () => readonly number[]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void
}

type Status = (kind: PendingKind, key: string, base: RowsStatus) => RowState

// The rows captured but not yet booked: they stand below the capture row,
// go out with the document and leave once it shows them.
export class CapturedRows {
  private readonly host: CapturedRowsHost

  private readonly row: CaptureRow

  private readonly status: Status

  private rows: CapturedRow[] = []

  private nextKey = 1

  private correction: { key: string; slot: number } | null = null

  constructor(host: CapturedRowsHost, row: CaptureRow, status: Status) {
    this.host = host
    this.row = row
    this.status = status
  }

  get values(): readonly (readonly string[])[] {
    return this.rows.map((z) => z.values)
  }

  get correctionSlot(): number | null {
    return this.correction === null ? null : this.correction.slot
  }

  private get topKey(): string {
    return `e${this.nextKey}`
  }

  // Only what stands below the line goes out, never the capture row.
  pendingMarks(): PendingRow[] {
    return this.rows
      .filter((z) => z.written === undefined)
      .map((z) => ({ key: z.key, values: z.values as readonly string[] }))
  }

  statusAt(index: number): RowState {
    const row = this.rows[index]
    return this.status(
      'captured',
      row?.key ?? '',
      row?.written === undefined ? 'captured' : 'written',
    )
  }

  // The typed row moves down to the captured ones: Enter or Tab past the last
  // column. A required cell left empty holds it back, and the cursor goes there.
  captureRow(): boolean {
    const outcome = this.capture(this.host.context())
    if (outcome === 'nothing') return false
    if (outcome === 'captured') this.host.captured()
    else this.host.focusCell(outcome.missing)
    return true
  }

  private capture(context: CaptureContext): 'captured' | 'nothing' | { missing: number } {
    this.row.compute(context)
    const values = context.columns.map((_, i) => this.row.valueIn(context, i))
    const back = this.correction
    if (values.every((w) => w === '')) {
      if (!back) return 'nothing'
      this.correction = null
      this.row.clear()
      return 'captured'
    }
    const missing = missingRequired(context.columns, values, this.host.shown())
    this.row.hold(missing)
    if (missing !== -1) return { missing }
    if (back) {
      this.rows = [
        ...this.rows.slice(0, back.slot),
        { key: back.key, values, ...this.row.helpersNow() },
        ...this.rows.slice(back.slot),
      ]
      this.correction = null
    } else {
      this.rows = [...this.rows, { key: this.topKey, values, ...this.row.helpersNow() }]
      this.nextKey += 1
    }
    this.row.clear()
    return 'captured'
  }

  // A captured row goes back into the capture row. What stands there is captured
  // first, so nothing is lost; a required cell left empty there comes first.
  bringBack(index: number): void {
    const context = this.host.context()
    const row = this.rows[index]
    if (!row || row.written !== undefined) return
    const before = this.capture(context)
    if (typeof before === 'object') {
      this.host.focusCell(before.missing)
      return
    }
    const now = this.rows.indexOf(row)
    if (now === -1) return
    this.rows = this.rows.filter((_, i) => i !== now)
    this.correction = { key: row.key, slot: now }
    this.row.adoptRow(context, row.values, row)
    this.host.report()
    this.host.focusCell(this.row.firstCell)
  }

  remove(index: number): void {
    if (index < 0 || index >= this.rows.length) return
    this.rows = this.rows.filter((_, i) => i !== index)
    if (this.correction !== null && index < this.correction.slot) {
      this.correction = { ...this.correction, slot: this.correction.slot - 1 }
    }
    this.host.report()
  }

  // The rows a run wrote carry their record now and wait for the document.
  markWritten(written: readonly WrittenRow[]): boolean {
    if (written.length === 0) return false
    const records = new Map(written.map((g) => [g.key, { record: g.record }]))
    let changed = false
    this.rows = this.rows.map((z) => {
      const mark = z.written === undefined ? records.get(z.key) : undefined
      if (mark === undefined) return z
      changed = true
      return { ...z, written: mark }
    })
    return changed
  }

  hasWritten(): boolean {
    return this.rows.some((row) => row.written !== undefined)
  }

  // The document closed without an answer: the written rows leave.
  dropWritten(): void {
    const away = new Set<number>()
    this.rows.forEach((row, slot) => {
      if (row.written !== undefined) away.add(slot)
    })
    this.rows = this.rows.filter((_, slot) => !away.has(slot))
    this.slideCorrection(away)
  }

  // The document answered: the written rows it shows leave, the others go
  // back to pending and are named as missing.
  arrival(delivery: Delivery): { missing: string[]; moved: boolean } {
    const sent: { slot: number; record: string; values: readonly string[] }[] = []
    this.rows.forEach((row, slot) => {
      const mark = row.written
      if (mark !== undefined) sent.push({ slot, record: mark.record, values: row.values })
    })
    if (sent.length === 0) return { missing: [], moved: false }

    const arrived = arrivalCheck(sent, this.host.columns(), delivery)

    const away = new Set<number>()
    const missing: string[] = []
    sent.forEach((row, i) => {
      if (arrived[i] === true) {
        away.add(row.slot)
        return
      }
      missing.push(this.rows[row.slot]?.key ?? '')
    })
    this.rows = this.rows
      .filter((_, slot) => !away.has(slot))
      .map((row) => (missing.includes(row.key)
        ? { ...row, written: undefined }
        : row))

    this.slideCorrection(away)
    return { missing, moved: true }
  }

  // Rows left the list: the row under correction keeps its place among those
  // that stayed.
  private slideCorrection(away: ReadonlySet<number>): void {
    const back = this.correction
    if (back === null) return
    const before = [...away].filter((slot) => slot < back.slot).length
    if (before > 0) this.correction = { ...back, slot: back.slot - before }
  }
}
