import type { Delivery, PendingKind, WrittenRow } from '../../core/block/capability'
import { splitBinding } from '../../core/block/binding'
import {
  addRow,
  calculationFlaws,
  computeRow,
  resultSlots,
  type Calculation,
  type Factor,
  type FactorState,
} from '../../core/data/calculation'
import { columnWithKey, type Column } from '../list/columns'
import {
  lookupEntries,
  sourcesRows,
  suggestionsInWindowState,
  type Entry,
} from '../lookup/lookup'
import { asNumber } from '../list/sorting'
import { rowsIndexOf } from '../list/sourceRows'
import { SuggestionState, type KeyAction } from '../lookup/suggestionState'
import { SUGGESTIONS_MAX } from '../lookup/suggestionList'
import { plainText, rowFits } from '../list/textSearch'
import { maskState } from '../../runtime/maskState'
import { outsideValue } from '../../runtime/foreignSources'
import type { KeyPair } from '../../core/data/extraSources'
import {
  arrivalCheck,
  changeArrived,
  deletionArrived,
  valueEquals,
} from './arrival'
import { cellsFields, enterCell } from './cells'
import type { CaptureColumn } from './column'
import {
  captureContext,
  cellTargetOf,
  displayColumnIn,
  fittingRecords,
  linkedSourcesIn,
  missingRequired,
  neighbourSlot,
  sameSourceCodes,
  targetIn,
  windowColumnsIn,
  type CaptureContext,
} from './row'

type RowsStatus =
  | 'booked'
  | 'captured'
  | 'changed'
  | 'deletion'
  | 'writes'

  | 'written'
  | 'error'

export interface RowState {
  status: RowsStatus
}

const BOOKED_ROWS = '.body > .row:not(.capture)'

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
  return number === null ? { kind: 'invalid', text: t } : { kind: 'number', number }
}

interface CapturedRow {
  key: string

  values: string[]

  written?: { record: string }
}

interface PendingRow {
  key: string

  values: readonly string[]
}

interface LookupSpot {
  spot: string

  sourceId: string

  field: string

  title: string

  columns: readonly Column[]

  entries: readonly Entry[]

  searchText: string
}

interface CaptureHost {
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

// Everything the capture holds: the capture row, the rows captured but
// not yet booked, the changed cells and deletion marks of the booked rows and
// what is out with the document waiting for an answer.
export class CaptureLedger {
  private readonly host: CaptureHost

  private readonly typed = new Map<number, string>()

  private readonly chosen = new Map<string, unknown>()

  private readonly byHand = new Set<string>()

  private readonly list = new SuggestionState<Entry>()

  private computed = new Map<number, string>()

  private cursorColumn = -1

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

  private readonly errors = new Map<PendingKind, Set<string>>()

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

  // ----- the capture row -----

  get typingColumn(): number {
    return this.cursorColumn
  }

  get mark(): number {
    return this.list.mark
  }

  get suggestions(): readonly Entry[] {
    return this.list.hit
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
    return record === undefined ? '' : maskState.host.readField(record, target.code)
  }

  type(index: number, text: string): void {
    this.typed.set(index, text)
    this.cursorColumn = index
    this.list.restart()
    this.host.report()
  }

  leave(index: number): void {
    if (this.cursorColumn === index) {
      this.settleTyped(this.context(), index)
      this.cursorColumn = -1
      this.listColumn = -1
      this.list.idle()
    }
    this.host.report()
  }

  // A cell of a helper source holds a value of that source, never loose text:
  // what was typed takes the exact hit, or falls away.
  private settleTyped(context: CaptureContext, index: number): void {
    const typed = (this.typed.get(index) ?? '').trim()
    if (typed === '' || targetIn(context, index).kind !== 'linked') return
    const wanted = plainText(typed)
    const exact = this.entriesIn(context, index).filter((e) => plainText(e.value.trim()) === wanted)
    if (exact.length === 1) this.adopt(index, exact[0].record)
    else this.typed.delete(index)
  }

  empty(index: number): void {
    const context = this.context()
    this.typed.delete(index)
    const target = targetIn(context, index)
    if (target.sourceId !== '' && this.chosen.has(target.sourceId)) {
      this.choose(context, target.sourceId, undefined)
    }
    this.list.restart()
    this.host.report()
  }

  setMark(mark: number): void {
    this.list.setMark(mark)
    this.host.report()
  }

  openList(index: number): void {
    this.cursorColumn = index
    this.listColumn = index
    this.list.openList()
    this.host.report()
  }

  decideKey(index: number, key: string): KeyAction {
    const context = this.context()
    const target = targetIn(context, index)
    const action = this.list.actionFor(key, {
      listOpen: this.cursorColumn === index && this.list.open,
      fieldEmpty: this.valueIn(context, index) === '',
      typed: this.typed.get(index) !== undefined,
      lookupable: target.kind === 'linked',
      hasRecords: () => this.entriesIn(context, index).length > 0,
      jumps: true,
    })
    if (action === 'closeList') this.listColumn = -1
    // The key moved the mark or closed the list: what the operator sees is a
    // step further than the drawing.
    if (action !== 'nothing') this.host.report()
    return action
  }

  neighbour(from: number, direction: 1 | -1): number {
    return neighbourSlot(this.host.columns(), from, direction)
  }

  focusCell(index: number): void {
    this.host.focusCell(index)
  }

  // Enter and Tab go one column on; past the last one they capture the row.
  jumpFrom(index: number, key: string): boolean {
    this.settleTyped(this.context(), index)
    const next = this.neighbour(index, 1)
    if (next !== -1) {
      this.host.focusCell(next)
      return true
    }
    if (key !== 'Tab' && key !== 'Enter') return true
    return this.captureRow()
  }

  // What the lookup window of a cell shows. Nothing when the column names no
  // field of a helper source, or that source holds no rows.
  lookupAt(index: number): LookupSpot | null {
    const context = this.context()
    const column = context.columns[index]
    const target = targetIn(context, index)
    if (column === undefined || target.sourceId === '' || target.code === '') return null
    if (target.kind === 'linked' && (sourcesRows(target.sourceId)?.length ?? 0) === 0) return null
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
    this.byHand.add(target.sourceId)
    if (target.kind === 'own') {
      for (const id of [...this.chosen.keys()]) {
        if (id !== target.sourceId) this.choose(context, id, undefined)
      }
    }
    this.syncChosen(context)
    this.cursorColumn = -1
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

  // Before every drawing: the calculations run again and the suggestion list
  // holds what fits the typed text.
  refresh(): void {
    const context = this.context()
    this.compute(context)
    this.list.show(this.suggestionsFor(context))
  }

  // The typed words are looked for in every column of the same source; what
  // equals the typed text stands on top.
  private suggestionsFor(context: CaptureContext): Entry[] {
    const index = this.cursorColumn
    if (this.list.closed || targetIn(context, index).kind === 'free') return []
    const typed = this.typed.get(index) ?? ''
    if (typed === '' && this.listColumn !== index) return []
    const codes = sameSourceCodes(context, index)
    const texts = (e: Entry): string[] => [
      e.display, e.value, ...codes.map((code) => maskState.host.readField(e.record, code)),
    ]
    const entries = this.entriesIn(context, index)
    const hit = typed.trim() === '' ? entries : entries.filter((e) => rowFits(texts(e), typed))
    const wanted = plainText(typed.trim())
    const exact = (e: Entry): boolean => wanted !== '' && texts(e).some((t) => plainText(t.trim()) === wanted)
    const rest = suggestionsInWindowState(hit.filter((e) => !exact(e)), '',
      windowColumnsIn(context, index), context.block, context.columns[index]?.key)
    return [...hit.filter(exact), ...rest].slice(0, SUGGESTIONS_MAX)
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
      return textState(maskState.host.readField(record, code))
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
    return textState(maskState.host.readField(record, target.code))
  }

  private choose(context: CaptureContext, sourceId: string, record: unknown): void {
    if (record === undefined) {
      this.chosen.delete(sourceId)
      this.byHand.delete(sourceId)
    } else this.chosen.set(sourceId, record)
    for (let i = 0; i < context.columns.length; i++) {
      if (cellTargetOf(context.columns[i], context.sourceId).sourceId === sourceId) {
        this.typed.delete(i)
      }
    }
  }

  // The key a helper source takes from its partner. Another helper source
  // not chosen yet gives an empty key, so nothing fits. The row itself is
  // still being entered: its key restricts once it is known, from the chosen
  // record or from another helper source chosen by hand.
  private keyValue(
    context: CaptureContext,
    partnerId: string,
    field: string,
    except: string,
  ): string | undefined {
    if (partnerId !== '' && partnerId !== context.sourceId) {
      const record = this.chosen.get(partnerId)
      return record === undefined ? '' : maskState.host.readField(record, field)
    }
    const base = this.chosen.get(context.sourceId)
    if (base !== undefined) return maskState.host.readField(base, field)
    for (const sourceId of linkedSourcesIn(context)) {
      if (sourceId === except || !this.byHand.has(sourceId)) continue

      const partner = context.partnerOf(sourceId)
      if (partner !== '' && partner !== context.sourceId) continue
      const record = this.chosen.get(sourceId)
      if (record === undefined) continue
      for (const pair of context.pairsTo(sourceId)) {
        if (pair.from !== undefined || pair.fromField !== field) continue
        const value = maskState.host.readField(record, pair.toField)
        if (value !== '') return value
      }
    }
    return undefined
  }

  // The key of a pair: from the document or a form field, else from the
  // partner. An empty value counts as missing, and then nothing fits.
  private pairValue(
    context: CaptureContext,
    partnerId: string,
    pair: KeyPair,
    except: string,
  ): string | undefined {
    return outsideValue(pair, this.host.block) ?? this.keyValue(context, partnerId, pair.fromField, except)
  }

  private possible(context: CaptureContext, sourceId: string, rows: readonly unknown[]): unknown[] {
    const partnerId = context.partnerOf(sourceId)
    return fittingRecords(
      context.pairsTo(sourceId),
      (pair) => this.pairValue(context, partnerId, pair, sourceId),
      rows,
    )
  }

  private syncChosen(context: CaptureContext): void {
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
            const expected = this.pairValue(context, partnerId, p, sourceId)
            return expected === undefined || (expected !== '' && expected === maskState.host.readField(record, p.toField))
          })
          if (!fits) {
            this.choose(context, sourceId, undefined)
            moved = true
          }
          continue
        }
        if (!pairs.some((p) => this.pairValue(context, partnerId, p, sourceId) !== undefined)) continue
        const rows = sourcesRows(sourceId)
        if (rows === null) continue
        const fitting = this.possible(context, sourceId, rows)
        if (fitting.length === 1) {
          this.choose(context, sourceId, fitting[0])
          this.byHand.delete(sourceId)
          moved = true
        }
      }
      if (!moved) break
    }
  }

  private adoptValues(context: CaptureContext, values: readonly string[]): void {
    this.clearCaptureRow()
    values.forEach((value, index) => {
      if (value !== '') this.typed.set(index, value)
    })
    this.yieldToComputed(context)
    this.compute(context)
  }

  private yieldToComputed(context: CaptureContext): void {
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

  private clearCaptureRow(): void {
    this.typed.clear()
    this.chosen.clear()
    this.byHand.clear()
    this.computed.clear()
    this.cursorColumn = -1
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

  // Only what stands below the line goes out, never the capture row.
  pendingMarks(): PendingRow[] {
    return this.rows
      .filter((z) => z.written === undefined)
      .map((z) => ({ key: z.key, values: z.values as readonly string[] }))
  }

  capturedStatus(index: number): RowState {
    const row = this.rows[index]
    return this.shows(
      'captured',
      row?.key ?? '',
      row?.written === undefined ? 'captured' : 'written',
    )
  }

  // The typed row moves down to the captured ones: Enter or Tab past the last
  // column. A required cell left empty holds it back, and the cursor goes there.
  captureRow(): boolean {
    const outcome = this.capture(this.context())
    if (outcome === 'nothing') return false
    if (outcome === 'captured') this.host.captured()
    else this.host.focusCell(outcome.missing)
    return true
  }

  private capture(context: CaptureContext): 'captured' | 'nothing' | { missing: number } {
    this.compute(context)
    const values = context.columns.map((_, i) => this.valueIn(context, i))
    const back = this.correction
    if (values.every((w) => w === '')) {
      if (!back) return 'nothing'
      this.correction = null
      this.clearCaptureRow()
      return 'captured'
    }
    const missing = missingRequired(context.columns, values)
    if (missing !== -1) return { missing }
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
    this.clearCaptureRow()
    return 'captured'
  }

  // A captured row goes back into the capture row. What stands there is captured
  // first, so nothing is lost; a required cell left empty there comes first.
  bringBackCaptured(index: number): void {
    const context = this.context()
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

  statusOf(rawIndex: number): RowState {
    const record = this.recordOf(rawIndex)
    if (record === '') return { status: 'booked' }
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
    if (record === '') return
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
    enterCell(field)
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

  failed(kind: PendingKind, key: string): void {
    this.writing.get(kind)?.delete(key)
    const list = this.errors.get(kind) ?? new Set<string>()
    list.add(key)
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

  private shows(kind: PendingKind, key: string, base: RowsStatus): RowState {
    if (this.errors.get(kind)?.has(key) === true) return { status: 'error' }
    if (this.writing.get(kind)?.has(key) === true) return { status: 'writes' }
    return { status: base }
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
      this.host.report()
      return
    }
    const captured = this.capturedArrival(delivery)
    const booked = this.bookedArrival(delivery)
    for (const key of captured.missing) this.failed('captured', key)
    for (const record of booked.changeMissing) this.failed('changed', record)
    for (const record of booked.deletionMissing) this.failed('deleted', record)

    if (captured.moved || booked.moved) this.host.report()
  }

  private somethingInFlight(): boolean {
    return this.rows.some((row) => row.written !== undefined)
      || this.sent.size > 0
      || this.sentDeletion.size > 0
  }

  private capturedArrival(delivery: Delivery): {
    missing: string[]
    moved: boolean
  } {
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

  private bookedArrival(delivery: Delivery): {
    changeMissing: string[]
    deletionMissing: string[]
    moved: boolean
  } {
    if (this.sent.size === 0 && this.sentDeletion.size === 0) {
      return { changeMissing: [], deletionMissing: [], moved: false }
    }

    const deletionMissing: string[] = []
    for (const record of this.sentDeletion) {
      if (deletionArrived(record, delivery)) continue
      deletionMissing.push(record)
    }
    this.sentDeletion.clear()
    for (const record of deletionMissing) this.deleted.add(record)

    const changeMissing: string[] = []
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

    return { changeMissing, deletionMissing, moved: true }
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
