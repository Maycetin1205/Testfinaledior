import type { Delivery, PendingKind, WrittenRow } from '../../core/block/capability'
import { splitBinding } from '../../core/block/binding'
import {
  addRow,
  allFactors,
  calculationFlaws,
  computeRow,
  resultSlots,
  type Calculation,
  type Factor,
  type FactorState,
} from '../../core/data/calculation'
import { columnWithKey, type Column } from '../behavior/columns'
import {
  lookupEntries,
  sourcesRows,
  suggestionsInWindowState,
  type Entry,
} from '../behavior/lookup'
import { asNumber } from '../behavior/sorting'
import { rowsIndexOf } from '../behavior/sourceRows'
import { SuggestionState, type KeysFollow } from '../behavior/suggestionState'
import { fieldRead } from '../../softengine/data'
import { reportError } from '../../softengine/report'
import {
  arrivalCheck,
  changeArrived,
  deletionArrived,
  missingMessage,
  notChangedMessage,
  notDeletedMessage,
  valueEquals,
  type MissingRow,
} from './arrival'
import { cellsFields, walkInCell } from './cells'
import type { CaptureColumn } from './column'
import {
  captureContext,
  cellTargetOf,
  displayColumnIn,
  fittingRecords,
  linkedSourcesIn,
  neighbourSlot,
  targetIn,
  windowColumnsIn,
  type CaptureContext,
} from './row'

export type RowsStatus =
  | 'booked'
  | 'captured'
  | 'changed'
  | 'deletion'
  | 'writes'

  | 'written'
  | 'error'

export interface RowsIcon {
  status: RowsStatus

  title: string
}

const TITLE: Record<RowsStatus, string> = {
  booked: '',
  captured: 'Neu',
  changed: 'Geändert',
  deletion: 'Wird gelöscht',
  writes: 'Wird geschrieben …',
  written: 'Hinausgeschickt',
  error: 'Nicht geschrieben',
}

const NOT_ARRIVED = 'Nicht im Beleg angekommen.'

const NOT_CHANGED = 'Im Beleg unverändert geblieben.'

const NOT_DELETED = 'Steht noch im Beleg.'

const WITHOUT_ANSWER = 'Auf die Übergabe kam keine Antwort; ob die Positionen im Beleg stehen, '
  + 'ist ungeprüft.'

const WITHOUT_RECORD = 'Diese Zeile hat keine Satznummer; eine Änderung daran lässt sich nicht '
  + 'schreiben.'

function helperSourceHint(title: string, reason: string): string {
  const name = title.trim() === '' ? 'dieser Spalte' : `der Spalte „${title}“`
  return `Die Hilfsquelle ${name} ${reason}; hier lässt sich nichts nachschlagen.`
}

const BOOKED_ROWS = '.koerper > .zeile:not(.erfassung)'

// The cells of the booked rows: per record what stands in which column. A
// record without a cell is taken out, so the size answers "is anything here".
type Cells = Map<string, Map<number, string>>

function cellIn(cells: Cells, record: string, column: number): string | undefined {
  return record === '' ? undefined : cells.get(record)?.get(column)
}

function setCell(cells: Cells, record: string, column: number, value: string): boolean {
  if (record === '') return false
  const row = cells.get(record)
  if (row === undefined) {
    cells.set(record, new Map([[column, value]]))
    return true
  }
  if (row.get(column) === value) return false
  row.set(column, value)
  return true
}

function dropCell(cells: Cells, record: string, column: number): boolean {
  const row = cells.get(record)
  if (row === undefined || !row.delete(column)) return false
  if (row.size === 0) cells.delete(record)
  return true
}

function recordsIn(cells: Cells): string[] {
  return [...cells.keys()]
}

function hasRecordIn(cells: Cells, record: string): boolean {
  return record !== '' && cells.has(record)
}

function dropRecord(cells: Cells, record: string): boolean {
  return cells.delete(record)
}

function textState(raw: string): FactorState {
  const t = raw.trim()
  if (t === '') return { kind: 'empty' }
  const number = asNumber(t)
  return number === null ? { kind: 'ungueltig', text: t } : { kind: 'number', number }
}

interface CapturedRow {
  key: string

  values: string[]

  written?: { record: string }
}

export interface PendingRow {
  key: string

  values: readonly string[]
}

// What the lookup window of one capture cell opens on.
export interface LookupSpot {
  spot: string

  sourceId: string

  field: string

  title: string

  columns: readonly Column[]

  entries: readonly Entry[]

  searchText: string
}

// What the ledger needs of its capture: the declared list, the rows of the
// source and the two ways back into the drawing.
export interface CaptureHost {
  block: HTMLElement

  columns: () => readonly CaptureColumn[]

  calculations: () => readonly Calculation[]

  sourceId: () => string

  rawRows: () => readonly unknown[]

  dataRows: () => readonly string[][]

  report: () => void

  focusCell: (index: number) => void

  captured: () => void
}

// Everything the capture holds: the row under the pen, the rows captured but
// not yet booked, the changed cells and deletion marks of the booked rows and
// what is out with the document waiting for an answer.
export class CaptureLedger {
  private readonly host: CaptureHost

  private readonly typed = new Map<number, string>()

  private readonly chosen = new Map<string, unknown>()

  private readonly ofHand = new Set<string>()

  private readonly list = new SuggestionState<Entry>()

  private computed = new Map<number, string>()

  private calculationHints: string[] = []

  private lookupHint = ''

  private penColumn = -1

  private listColumn = -1

  private rows: CapturedRow[] = []

  private nextKey = 1

  private correction: { key: string; slot: number } | null = null

  private readonly changes: Cells = new Map()

  private readonly sent: Cells = new Map()

  private readonly previous: Cells = new Map()

  private readonly deleted = new Set<string>()

  private readonly sentDeletion = new Set<string>()

  private readonly writing = new Map<PendingKind, Set<string>>()

  private readonly errors = new Map<PendingKind, Map<string, string>>()

  constructor(host: CaptureHost) {
    this.host = host
  }

  private context(): CaptureContext {
    return captureContext(
      this.host.block,
      this.host.columns(),
      this.host.sourceId(),
      this.host.calculations(),
    )
  }

  // ----- the row under the pen -----

  get typingColumn(): number {
    return this.penColumn
  }

  get mark(): number {
    return this.list.mark
  }

  get suggestions(): readonly Entry[] {
    return this.list.hit
  }

  get hints(): readonly string[] {
    return this.lookupHint === ''
      ? this.calculationHints
      : [...this.calculationHints, this.lookupHint]
  }

  // What the capture row shows: one pass over the columns instead of one
  // question per cell.
  rowView(): { value: string; automatic: boolean }[] {
    const context = this.context()
    return context.columns.map((_, index) => {
      const typed = this.typed.get(index)
      const computed = typed === '' && this.computed.has(index)
      const value = this.valueIn(context, index)
      return { value, automatic: (typed === undefined || computed) && value !== '' }
    })
  }

  private valueIn(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
    if (typed !== undefined && typed !== '') return typed
    const computed = this.computed.get(index)
    if (computed !== undefined) return computed
    if (typed !== undefined) return typed
    const target = targetIn(context, index)
    if (target.sourceId === '' || target.code === '') return ''
    const record = this.chosen.get(target.sourceId)
    return record === undefined ? '' : fieldRead(record, target.code)
  }

  type(index: number, text: string): void {
    this.typed.set(index, text)
    this.penColumn = index
    this.list.ofFront()
    this.host.report()
  }

  leave(index: number): void {
    if (this.penColumn === index) {
      this.penColumn = -1
      this.listColumn = -1
      this.list.idle()
    }
    this.host.report()
  }

  empty(index: number): void {
    const context = this.context()
    this.typed.delete(index)
    const target = targetIn(context, index)
    if (target.sourceId !== '' && this.chosen.has(target.sourceId)) {
      this.choose(context, target.sourceId, undefined)
    }
    this.list.ofFront()
    this.host.report()
  }

  setMark(mark: number): void {
    this.list.setMark(mark)
    this.host.report()
  }

  openList(index: number): void {
    this.penColumn = index
    this.listColumn = index
    this.list.openList()
    this.host.report()
  }

  decideKey(index: number, key: string): KeysFollow {
    const context = this.context()
    const target = targetIn(context, index)
    const follow = this.list.followFor(key, {
      listOpen: this.penColumn === index && this.list.open,
      fieldEmpty: this.valueIn(context, index) === '',
      typed: this.typed.get(index) !== undefined,
      lookupable: target.kind === 'linked',
      hasRecords: () => this.entriesIn(context, index).length > 0,
      jumps: true,
    })
    if (follow === 'liste-zu') this.listColumn = -1
    // The key moved the mark or closed the list: what the operator sees is a
    // step further than the drawing.
    if (follow !== 'nothing') this.host.report()
    return follow
  }

  nextEmpty(off: number): number {
    const context = this.context()
    for (let i = off + 1; i < context.columns.length; i++) {
      if (context.columns[i]?.hidden === true) continue
      if (this.valueIn(context, i) === '') return i
    }
    return -1
  }

  neighbour(off: number, direction: 1 | -1): number {
    return neighbourSlot(this.host.columns(), off, direction)
  }

  focusCell(index: number): void {
    this.host.focusCell(index)
  }

  // Where the pen goes next: Tab walks to the neighbour column, the other keys
  // look for the next empty cell and capture the row when none is left.
  jumpFrom(index: number, key: string): boolean {
    if (key === 'Tab') {
      const next = this.neighbour(index, 1)
      if (next !== -1) {
        this.host.focusCell(next)
        return true
      }
      return this.captureRow()
    }
    const target = this.nextEmpty(index)
    if (target !== -1) this.host.focusCell(target)
    else if (key === 'Enter') this.captureRow()
    return true
  }

  // What the lookup window of a cell shows. Nothing when the column names no
  // field of a helper source.
  lookupAt(index: number): LookupSpot | null {
    const context = this.context()
    const column = context.columns[index]
    const target = targetIn(context, index)
    if (column === undefined || target.sourceId === '' || target.code === '') return null
    return {
      spot: column.key,
      sourceId: target.sourceId,
      field: target.code,
      title: column.title,
      columns: windowColumnsIn(context, index),
      entries: this.entriesIn(context, index),
      searchText: this.valueIn(context, index),
    }
  }

  adoptSuggestion(index: number, listIndex: number): void {
    const hit = this.list.hit[listIndex]
    if (hit === undefined) return
    this.adopt(index, hit.record)
  }

  adopt(index: number, record: unknown): void {
    const context = this.context()
    const target = targetIn(context, index)
    if (target.sourceId === '') return
    this.choose(context, target.sourceId, record)
    this.ofHand.add(target.sourceId)
    if (target.kind === 'own') {
      for (const id of [...this.chosen.keys()]) {
        if (id !== target.sourceId) this.choose(context, id, undefined)
      }
    }
    this.sameOff(context)
    this.penColumn = -1
    this.list.idle()
    this.host.report()
  }

  entriesFor(index: number): Entry[] {
    return this.entriesIn(this.context(), index)
  }

  private entriesIn(context: CaptureContext, index: number): Entry[] {
    const target = targetIn(context, index)
    if (target.kind !== 'linked' || target.sourceId === '' || target.code === '') return []
    const rows = sourcesRows(target.sourceId)
    if (rows === null) return []
    const records = this.possible(context, target.sourceId, rows)
    return lookupEntries(records, displayColumnIn(context, index)?.code ?? '', target.code)
  }

  // Why nothing can be looked up in this cell. Without it the operator faces an
  // empty list and no reason.
  lookupProblemAt(index: number): string {
    return this.lookupProblemIn(this.context(), index)
  }

  private lookupProblemIn(context: CaptureContext, index: number): string {
    const target = targetIn(context, index)
    if (target.kind !== 'linked') return ''
    const rows = sourcesRows(target.sourceId)
    if (rows === null) {
      return helperSourceHint(context.columns[index]?.title ?? '', 'gibt es in dieser Maske nicht')
    }
    if (rows.length === 0) {
      return helperSourceHint(context.columns[index]?.title ?? '', 'hat keine Daten geliefert')
    }
    return ''
  }

  // Before every drawing: the calculations run again and the suggestion list
  // holds what fits the typed text.
  refresh(): void {
    const context = this.context()
    this.compute(context)
    this.lookupHint = this.penColumn === -1 ? '' : this.lookupProblemIn(context, this.penColumn)
    this.list.show(this.suggestionsFor(context))
  }

  private suggestionsFor(context: CaptureContext): Entry[] {
    const index = this.penColumn
    if (this.list.closed || targetIn(context, index).kind === 'free') return []
    const typed = this.typed.get(index) ?? ''
    if (typed === '') {
      if (this.listColumn !== index) return []
    }
    return suggestionsInWindowState(this.entriesIn(context, index), typed,
      windowColumnsIn(context, index), context.block, context.columns[index]?.key)
  }

  private compute(context: CaptureContext): void {
    const titleOf = (key: string): string | null => {
      const i = columnWithKey(context.columns, key)
      return i === -1 ? null : (context.columns[i].title || key)
    }
    const row = computeRow(
      context.calculations,
      (key) => columnWithKey(context.columns, key),
      (factor) => this.factorState(context, factor),

      (b) => calculationFlaws(b, titleOf, (field) => (field === '' ? null : field)),
      (key) => titleOf(key) ?? '',
    )
    this.computed = new Map([...row.values].map(([slot, value]) => [slot, value.text]))
    this.calculationHints = []
    for (const calculation of context.calculations) {
      const placement = row.placements.get(calculation.key)
      if (placement === undefined || (placement.kind !== 'widerspruch' && placement.kind !== 'incomplete')) continue

      if (!this.groupTouched(context, calculation)) continue
      if (!this.calculationHints.includes(placement.text)) this.calculationHints.push(placement.text)
    }
  }

  private groupTouched(context: CaptureContext, calculation: Calculation): boolean {
    return allFactors(calculation).some((f) => {
      if (f.kind !== 'column') return false
      const slot = columnWithKey(context.columns, f.column)
      return slot !== -1 && (this.typed.get(slot) ?? '') !== ''
    })
  }

  private factorState(context: CaptureContext, factor: Factor): FactorState {
    if (factor.kind === 'number') return { kind: 'number', number: factor.number }
    if (factor.kind === 'dataField') {
      const { sourceId, code } = splitBinding(factor.field)
      const id = sourceId === '' ? context.sourceId : sourceId
      if (id === '' || code === '') return { kind: 'empty' }
      const record = this.chosen.get(id)
      if (record === undefined) {
        return sourcesRows(id) === null ? { kind: 'notLoaded' } : { kind: 'withoutRecord' }
      }
      return textState(fieldRead(record, code))
    }
    const slot = columnWithKey(context.columns, factor.column)
    if (slot === -1) return { kind: 'empty' }
    const typed = this.typed.get(slot)
    if (typed !== undefined && typed.trim() !== '') return textState(typed)

    if (typed !== undefined) return { kind: 'empty' }
    const target = targetIn(context, slot)
    if (target.sourceId === '' || target.code === '') return { kind: 'empty' }
    const record = this.chosen.get(target.sourceId)
    if (record === undefined) return { kind: 'empty' }
    return textState(fieldRead(record, target.code))
  }

  private choose(context: CaptureContext, sourceId: string, record: unknown): void {
    if (record === undefined) {
      this.chosen.delete(sourceId)
      this.ofHand.delete(sourceId)
    } else this.chosen.set(sourceId, record)
    for (let i = 0; i < context.columns.length; i++) {
      if (cellTargetOf(context.columns[i], context.sourceId).sourceId === sourceId) {
        this.typed.delete(i)
      }
    }
  }

  private keyValue(
    context: CaptureContext,
    partnerId: string,
    field: string,
    except: string,
  ): string | undefined {
    if (partnerId !== '' && partnerId !== context.sourceId) {
      const record = this.chosen.get(partnerId)
      return record === undefined ? undefined : fieldRead(record, field)
    }
    const base = this.chosen.get(context.sourceId)
    if (base !== undefined) return fieldRead(base, field)
    for (const sourceId of linkedSourcesIn(context)) {
      if (sourceId === except || !this.ofHand.has(sourceId)) continue

      const partner = context.partnerOf(sourceId)
      if (partner !== '' && partner !== context.sourceId) continue
      const record = this.chosen.get(sourceId)
      if (record === undefined) continue
      for (const pair of context.pairsTo(sourceId)) {
        if (pair.ofField !== field) continue
        const value = fieldRead(record, pair.toField)
        if (value !== '') return value
      }
    }
    return undefined
  }

  private possible(context: CaptureContext, sourceId: string, rows: readonly unknown[]): unknown[] {
    const partnerId = context.partnerOf(sourceId)
    return fittingRecords(
      context.pairsTo(sourceId),
      (field) => this.keyValue(context, partnerId, field, sourceId),
      rows,
    )
  }

  private sameOff(context: CaptureContext): void {
    const sources = linkedSourcesIn(context)
    for (let round = 0; round <= sources.length; round++) {
      let moved = false
      for (const sourceId of sources) {
        const pairs = context.pairsTo(sourceId)
        if (pairs.length === 0) continue
        const partnerId = context.partnerOf(sourceId)
        const record = this.chosen.get(sourceId)
        if (record !== undefined) {
          const fits = pairs.every((p) => {
            const should = this.keyValue(context, partnerId, p.ofField, sourceId)
            return should === undefined || (should !== '' && should === fieldRead(record, p.toField))
          })
          if (!fits) {
            this.choose(context, sourceId, undefined)
            moved = true
          }
          continue
        }
        if (!pairs.some((p) => this.keyValue(context, partnerId, p.ofField, sourceId) !== undefined)) continue
        const rows = sourcesRows(sourceId)
        if (rows === null) continue
        const fitting = this.possible(context, sourceId, rows)
        if (fitting.length === 1) {
          this.choose(context, sourceId, fitting[0])
          this.ofHand.delete(sourceId)
          moved = true
        }
      }
      if (!moved) break
    }
  }

  private adoptValues(context: CaptureContext, values: readonly string[]): void {
    this.emptyPen()
    values.forEach((value, index) => {
      if (value !== '') this.typed.set(index, value)
    })
    this.giveTheComputedTheirGap(context)
    this.compute(context)
  }

  private giveTheComputedTheirGap(context: CaptureContext): void {
    const slots = resultSlots(
      context.calculations,
      (key) => columnWithKey(context.columns, key),
    )
    for (const index of slots) {
      const value = this.typed.get(index)
      if (value === undefined || value === '') continue
      this.typed.delete(index)
      this.compute(context)
      if (this.computed.get(index) !== value) this.typed.set(index, value)
    }
  }

  private emptyPen(): void {
    this.typed.clear()
    this.chosen.clear()
    this.ofHand.clear()
    this.computed.clear()
    this.calculationHints = []
    this.lookupHint = ''
    this.penColumn = -1
    this.listColumn = -1
    this.list.idle()
  }

  // ----- the captured rows -----

  get capturedValues(): readonly (readonly string[])[] {
    return this.rows.map((z) => z.values)
  }

  get correctionSlot(): number | null {
    return this.correction === null ? null : this.correction.slot
  }

  private get topKey(): string {
    return `e${this.nextKey}`
  }

  pendingMarks(): PendingRow[] {
    const context = this.context()
    const all = this.rows
      .filter((z) => z.written === undefined)
      .map((z) => ({ key: z.key, values: z.values as readonly string[] }))
    const top = context.columns.map((_, i) => this.valueIn(context, i))
    if (top.every((w) => w === '')) return all
    const back = this.correction
    if (!back) return [...all, { key: this.topKey, values: top }]
    const slot = this.rows
      .slice(0, back.slot)
      .filter((z) => z.written === undefined).length
    return [
      ...all.slice(0, slot),
      { key: back.key, values: top },
      ...all.slice(slot),
    ]
  }

  capturedStatus(index: number): RowsIcon {
    const row = this.rows[index]
    return this.shows(
      'captured',
      row?.key ?? '',
      row?.written === undefined ? 'captured' : 'written',
    )
  }

  // The typed row moves down to the captured ones: Tab past the last column,
  // Enter when no column is empty any more.
  captureRow(): boolean {
    if (!this.capture(this.context())) return false
    this.host.captured()
    return true
  }

  private capture(context: CaptureContext): boolean {
    this.compute(context)
    const values = context.columns.map((_, i) => this.valueIn(context, i))
    const back = this.correction
    if (values.every((w) => w === '')) {
      if (!back) return false
      this.correction = null
      this.emptyPen()
      return true
    }
    if (back) {
      this.rows = [
        ...this.rows.slice(0, back.slot),
        { key: back.key, values },
        ...this.rows.slice(back.slot),
      ]
      this.correction = null
    } else {
      this.rows = [...this.rows, { key: this.topKey, values }]
      this.nextKey += 1
    }
    this.emptyPen()
    return true
  }

  // A captured row goes back under the pen. What stands there is captured
  // first, so nothing is lost.
  bringBackCaptured(index: number): void {
    const context = this.context()
    const row = this.rows[index]
    if (!row || row.written !== undefined) return
    this.capture(context)
    const now = this.rows.indexOf(row)
    if (now === -1) return
    this.rows = this.rows.filter((_, i) => i !== now)
    this.correction = { key: row.key, slot: now }
    this.adoptValues(context, row.values)
    this.host.report()
    this.host.focusCell(0)
  }

  removeCaptured(index: number): void {
    if (index < 0 || index >= this.rows.length) return
    this.rows = this.rows.filter((_, i) => i !== index)
    if (this.correction !== null && index < this.correction.slot) {
      this.correction = { ...this.correction, slot: this.correction.slot - 1 }
    }
    this.host.report()
  }

  private markWritten(written: readonly WrittenRow[]): boolean {
    if (written.length === 0) return false
    const context = this.context()
    const records = new Map(written.map((g) => [g.key, { record: g.record }]))
    let changed = false
    this.rows = this.rows.map((z) => {
      const mark = z.written === undefined ? records.get(z.key) : undefined
      if (mark === undefined) return z
      changed = true
      return { ...z, written: mark }
    })
    const back = this.correction
    const topMark = records.get(back === null ? this.topKey : back.key)
    if (topMark === undefined) return changed
    const values = context.columns.map((_, i) => this.valueIn(context, i))
    if (back !== null) {
      this.rows = [
        ...this.rows.slice(0, back.slot),
        { key: back.key, values, written: topMark },
        ...this.rows.slice(back.slot),
      ]
      this.correction = null
      this.emptyPen()
      return true
    }
    if (values.every((w) => w === '')) return changed
    this.rows = [...this.rows, { key: this.topKey, values, written: topMark }]
    this.nextKey += 1
    this.emptyPen()
    return true
  }

  // ----- the booked rows -----

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this.rowsOf(recordsIn(this.changes))
  }

  get deletedRows(): readonly { record: string; values: readonly string[] }[] {
    return this.rowsOf([...this.deleted])
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

  private itemOf(rawIndex: number | undefined): string {
    if (rawIndex === undefined) return ''
    return this.host.columns()
      .map((_, column) => this.cellValue(rawIndex, column))
      .find((value) => value.trim() !== '') ?? ''
  }

  statusOf(rawIndex: number): RowsIcon {
    const record = this.recordOf(rawIndex)
    if (record === '') return { status: 'booked', title: '' }
    if (this.deleted.has(record)) return this.shows('deleted', record, 'deletion')
    if (this.sentDeletion.has(record)) return this.shows('deleted', record, 'written')
    const columns = this.host.columns()
    if (columns.some((_, column) => cellIn(this.changes, record, column) !== undefined)) {
      return this.shows('changed', record, 'changed')
    }
    const inFlight = columns.some((_, column) => cellIn(this.sent, record, column) !== undefined)
    return this.shows('changed', record, inFlight ? 'written' : 'booked')
  }

  isDeleted(rawIndex: number): boolean {
    const record = this.recordOf(rawIndex)
    return record !== '' && (this.deleted.has(record) || this.sentDeletion.has(record))
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
    if (!resultSlots(calculations, slotOf).has(columnsIndex)) return null
    const leadSlots = new Set(calculations.map((b) => slotOf(b.lead.column)))
    const row = this.host.dataRows()[rawIndex]
    const computed = addRow(
      calculations,
      slotOf,
      (slot) => {
        const own = cellIn(this.changes, record, slot) ?? cellIn(this.sent, record, slot)

        return own ?? (leadSlots.has(slot) ? '' : row?.[slot] ?? '')
      },
      asNumber,
    )
    return computed.get(columnsIndex)?.text ?? null
  }

  typeCell(rawIndex: number, columnsIndex: number, text: string): void {
    const record = this.recordOf(rawIndex)
    if (record === '') {
      reportError(WITHOUT_RECORD)
      return
    }
    if (setCell(this.changes, record, columnsIndex, text)) this.host.report()
  }

  leaveCell(rawIndex: number, columnsIndex: number, text: string): void {
    const record = this.recordOf(rawIndex)
    const inFlight = cellIn(this.sent, record, columnsIndex)
    if (inFlight !== undefined) {
      if (text === inFlight) return
      dropCell(this.sent, record, columnsIndex)
      dropCell(this.previous, record, columnsIndex)
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
        this.host.focusCell(0)
        return
      }
      target = fields.length - 1
    }
    if (target < 0) target = 0
    const field = fields[target]
    if (field === of) return
    walkInCell(field)
  }

  toggleDeletion(rawIndex: number): void {
    const record = this.recordOf(rawIndex)
    if (record === '') return
    if (this.deleted.has(record)) this.deleted.delete(record)

    else if (this.sentDeletion.has(record)) this.sentDeletion.delete(record)
    else {
      this.deleted.add(record)
      dropRecord(this.changes, record)

      this.forgetWaiting(record)
    }
    this.host.report()
  }

  private forgetWaiting(record: string): void {
    dropRecord(this.sent, record)
    dropRecord(this.previous, record)
  }

  // ----- what is out with the document -----

  writes(kind: PendingKind, key: string): void {
    this.errors.get(kind)?.delete(key)
    const list = this.writing.get(kind) ?? new Set<string>()
    list.add(key)
    this.writing.set(kind, list)
    this.host.report()
  }

  failed(kind: PendingKind, key: string, message: string): void {
    this.writing.get(kind)?.delete(key)
    const list = this.errors.get(kind) ?? new Map<string, string>()
    list.set(key, message)
    this.errors.set(kind, list)
    this.host.report()
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    const keys = written.map((z) => z.key)
    this.writing.get(kind)?.clear()
    const open = this.errors.get(kind)
    if (open) {
      for (const key of keys) open.delete(key)
    }
    this.host.report()
    if (kind === 'captured') {
      if (this.markWritten(written)) this.host.report()
      return
    }
    this.takeOut(kind, keys)
  }

  private shows(kind: PendingKind, key: string, base: RowsStatus): RowsIcon {
    const message = this.errors.get(kind)?.get(key)
    if (message !== undefined) return { status: 'error', title: TITLE.error + ': ' + message }
    if (this.writing.get(kind)?.has(key) === true) {
      return { status: 'writes', title: TITLE.writes }
    }
    return { status: base, title: TITLE[base] }
  }

  // A written row leaves the pending marks and waits for the document to show
  // it; the value before the write stays for the arrival check.
  private takeOut(kind: PendingKind, keys: readonly string[]): void {
    let away = false
    const slots = kind === 'changed' ? this.recordSlots() : undefined
    for (const record of keys) {
      if (kind === 'changed') {
        const rawIndex = slots?.get(record)
        this.host.columns().forEach((_, column) => {
          const value = cellIn(this.changes, record, column)
          if (value === undefined) return
          const before = rawIndex === undefined
            ? ''
            : this.host.dataRows()[rawIndex]?.[column] ?? ''

          if (valueEquals(value, before)) return
          setCell(this.sent, record, column, value)
          setCell(this.previous, record, column, before)
        })
        away = dropRecord(this.changes, record) || away
      } else if (this.deleted.delete(record)) {
        this.sentDeletion.add(record)
        away = true
      }
    }
    if (away) this.host.report()
  }

  // ----- the answer of the document -----

  checkArrival(delivery: Delivery | null): void {
    if (delivery === null) {
      if (!this.somethingInFlight()) return
      const away = new Set<number>()
      this.rows.forEach((row, slot) => {
        if (row.written !== undefined) away.add(slot)
      })
      this.rows = this.rows.filter((_, slot) => !away.has(slot))
      this.slideCorrection(away)
      this.sent.clear()
      this.previous.clear()
      this.sentDeletion.clear()
      reportError(WITHOUT_ANSWER)
      this.host.report()
      return
    }
    const captured = this.capturedArrival(delivery)
    const booked = this.bookedArrival(delivery)
    for (const key of captured.missing) this.failed('captured', key, NOT_ARRIVED)
    for (const record of booked.changeMissing) this.failed('changed', record, NOT_CHANGED)
    for (const record of booked.deletionMissing) this.failed('deleted', record, NOT_DELETED)

    const message = [captured.message, booked.message].filter((text) => text !== '').join(' ')
    if (message !== '') reportError(message)
    if (captured.moved || booked.moved) this.host.report()
  }

  private somethingInFlight(): boolean {
    return this.rows.some((row) => row.written !== undefined)
      || this.sent.size > 0
      || this.sentDeletion.size > 0
  }

  private capturedArrival(delivery: Delivery): {
    message: string
    missing: string[]
    moved: boolean
  } {
    const sent: { slot: number; record: string; values: readonly string[] }[] = []
    this.rows.forEach((row, slot) => {
      const mark = row.written
      if (mark !== undefined) sent.push({ slot, record: mark.record, values: row.values })
    })
    if (sent.length === 0) return { message: '', missing: [], moved: false }

    const arrived = arrivalCheck(sent, this.host.columns(), delivery)

    const away = new Set<number>()
    const missing: string[] = []
    const reported: MissingRow[] = []
    sent.forEach((row, i) => {
      if (arrived[i] === true) {
        away.add(row.slot)
        return
      }
      missing.push(this.rows[row.slot]?.key ?? '')
      reported.push({
        nr: row.record === '' ? String(row.slot + 1) : row.record,
        item: row.values.find((w) => w.trim() !== '') ?? '',
      })
    })
    this.rows = this.rows
      .filter((_, slot) => !away.has(slot))
      .map((row) => (missing.includes(row.key)
        ? { ...row, written: undefined }
        : row))

    this.slideCorrection(away)
    return { message: missingMessage(reported), missing, moved: true }
  }

  // Rows left the list: the row under correction keeps its place among those
  // that stayed.
  private slideCorrection(away: ReadonlySet<number>): void {
    const back = this.correction
    if (back === null) return
    const before = [...away].filter((slot) => slot < back.slot).length
    if (before > 0) this.correction = { ...back, slot: back.slot - before }
  }

  private bookedArrival(delivery: Delivery): {
    changeMissing: string[]
    deletionMissing: string[]
    message: string
    moved: boolean
  } {
    if (this.sent.size === 0 && this.sentDeletion.size === 0) {
      return { changeMissing: [], deletionMissing: [], message: '', moved: false }
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
    for (const record of recordsIn(this.sent)) {
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
        const value = cellIn(this.sent, record, column)
        if (value !== undefined && cellIn(this.changes, record, column) === undefined) {
          setCell(this.changes, record, column, value)
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
      if (cellIn(this.sent, record, index) === undefined || column.field === '') return
      out.push({ field: column.field, before: cellIn(this.previous, record, index) ?? '' })
    })
    return out
  }
}
