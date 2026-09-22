import type { WrittenRow, Delivery } from '../../core/block/capability'
import type { Calculation } from '../../core/data/calculation'
import { leftOf } from '../behavior/foreignSources'
import { arrivalCheck, missingMessage, type MissingRow } from './arrival'
import { CaptureRun } from './run'
import type { CaptureContext } from './row'
import type { CaptureColumn } from './column'

export interface ArrivalReport {
  message: string

  missing: readonly string[]

  changed: boolean
}

export class CaptureState {
  readonly run = new CaptureRun()

  private _rows: { key: string; values: string[]; written?: { record: string } }[] = []

  private nextKey = 1

  private _back: { key: string; slot: number } | null = null

  get correctionSlot(): number | null {
    return this._back === null ? null : this._back.slot
  }

  get rows(): readonly (readonly string[])[] {
    return this._rows.map((z) => z.values)
  }

  private get topKey(): string {
    return `e${this.nextKey}`
  }

  pendingMarks(context: CaptureContext): { key: string; values: readonly string[] }[] {
    const all = this._rows
      .filter((z) => z.written === undefined)
      .map((z) => ({ key: z.key, values: z.values as readonly string[] }))
    const top = context.columns.map((_, i) => this.run.valueAt(context, i))
    if (top.every((w) => w === '')) return all
    const back = this._back
    if (!back) return [...all, { key: this.topKey, values: top }]
    const slot = this._rows
      .slice(0, back.slot)
      .filter((z) => z.written === undefined).length
    return [
      ...all.slice(0, slot),
      { key: back.key, values: top },
      ...all.slice(slot),
    ]
  }

  isWritten(index: number): boolean {
    return this._rows[index]?.written !== undefined
  }

  get key(): readonly string[] {
    return this._rows.map((z) => z.key)
  }

  context(
    el: HTMLElement,
    columns: readonly CaptureColumn[],
    sourceId: string,
    calculations: readonly Calculation[],
  ): CaptureContext {
    const left = leftOf(el)
    return {
      block: el,
      columns,
      calculations,
      sourceId,
      pairsTo: (id) => left.find((v) => v.sourceId === id)?.pairs ?? [],
      partnerOf: (id) => left.find((v) => v.sourceId === id)?.partnerId ?? '',
    }
  }

  capture(context: CaptureContext): boolean {
    this.run.compute(context)
    const values = context.columns.map((_, i) => this.run.valueAt(context, i))
    const back = this._back
    if (values.every((w) => w === '')) {
      if (!back) return false
      this._back = null
      this.run.reset()
      return true
    }
    if (back) {
      this._rows = [
        ...this._rows.slice(0, back.slot),
        { key: back.key, values },
        ...this._rows.slice(back.slot),
      ]
      this._back = null
    } else {
      this._rows = [...this._rows, { key: this.topKey, values }]
      this.nextKey += 1
    }
    this.run.reset()
    return true
  }

  bringBack(context: CaptureContext, index: number): boolean {
    const row = this._rows[index]
    if (!row || row.written !== undefined) return false
    this.capture(context)
    const now = this._rows.indexOf(row)
    if (now === -1) return false
    this._rows = this._rows.filter((_, i) => i !== now)
    this._back = { key: row.key, slot: now }
    this.run.adoptValues(context, row.values)
    return true
  }

  remove(index: number): boolean {
    if (index < 0 || index >= this._rows.length) return false
    this._rows = this._rows.filter((_, i) => i !== index)
    if (this._back !== null && index < this._back.slot) {
      this._back = { ...this._back, slot: this._back.slot - 1 }
    }
    return true
  }

  markWritten(context: CaptureContext, sent: readonly WrittenRow[]): boolean {
    if (sent.length === 0) return false
    const records = new Map(sent.map((g) => [g.key, { record: g.record }]))
    let changed = false
    this._rows = this._rows.map((z) => {
      const mark = z.written === undefined ? records.get(z.key) : undefined
      if (mark === undefined) return z
      changed = true
      return { ...z, written: mark }
    })
    const back = this._back
    const topMark = records.get(back === null ? this.topKey : back.key)
    if (topMark === undefined) return changed
    const values = context.columns.map((_, i) => this.run.valueAt(context, i))
    if (back !== null) {
      this._rows = [
        ...this._rows.slice(0, back.slot),
        { key: back.key, values, written: topMark },
        ...this._rows.slice(back.slot),
      ]
      this._back = null
      this.run.reset()
      return true
    }
    if (values.every((w) => w === '')) return changed
    this._rows = [...this._rows, { key: this.topKey, values, written: topMark }]
    this.nextKey += 1
    this.run.reset()
    return true
  }

  checkArrival(delivery: Delivery | null, columns: readonly CaptureColumn[]): ArrivalReport {
    const sent: { slot: number; record: string; values: readonly string[] }[] = []
    this._rows.forEach((row, slot) => {
      const mark = row.written
      if (mark !== undefined) sent.push({ slot, record: mark.record, values: row.values })
    })
    if (sent.length === 0) return { message: '', missing: [], changed: false }

    const arrived = delivery === null
      ? sent.map(() => true)
      : arrivalCheck(sent, columns, delivery)

    const away = new Set<number>()
    const missing: string[] = []
    const reported: MissingRow[] = []
    sent.forEach((row, i) => {
      if (arrived[i] === true) {
        away.add(row.slot)
        return
      }
      missing.push(this._rows[row.slot]?.key ?? '')
      reported.push({
        nr: row.record === '' ? String(row.slot + 1) : row.record,
        item: row.values.find((w) => w.trim() !== '') ?? '',
      })
    })
    this._rows = this._rows
      .filter((_, slot) => !away.has(slot))
      .map((row) => (missing.includes(row.key)
        ? { ...row, written: undefined }
        : row))

    const back = this._back
    if (back !== null) {
      const before = [...away].filter((slot) => slot < back.slot).length
      if (before > 0) this._back = { ...back, slot: back.slot - before }
    }
    return { message: missingMessage(reported), missing, changed: true }
  }

  reset(): void {
    this._rows = []
    this._back = null
    this.run.reset()
  }
}
