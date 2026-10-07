import { columnSlots, rowValues } from '../../../core/data/calculation'
import type { KeyPair } from '../../../core/data/extraSources'
import { outsideValue } from '../../../runtime/foreignSources'
import { maskState } from '../../../runtime/maskState'
import { columnWithKey, type Column } from '../../list/columns'
import { walkOrder, type RowLayout } from '../../list/tableBody'
import { plainText, rowFits } from '../../list/textSearch'
import {
  automaticColumns,
  lookupEntries,
  sourcesRows,
  type Entry,
} from '../../lookup/lookup'
import { orderedSuggestions } from '../../lookup/suggestionList'
import { SuggestionState, type KeyAction } from '../../lookup/suggestionState'
import {
  cellTargetOf,
  displayColumnIn,
  fittingRecords,
  linkedSourcesIn,
  neighbourSlot,
  sameSourceCodes,
  targetIn,
  windowColumnsIn,
  type CaptureContext,
} from '../row'

// The helper records a row was captured with; a correction takes them back.
export interface Helpers {
  chosen: ReadonlyMap<string, unknown>
  byHand: ReadonlySet<string>
}

export interface LookupSpot {
  spot: string

  sourceId: string

  field: string

  title: string

  columns: readonly Column[]

  entries: readonly Entry[]

  searchText: string
}

interface CaptureRowHost {
  block: HTMLElement

  context: () => CaptureContext

  // The columns the operator sees: those of the row and of its grey line.
  layout: () => RowLayout

  report: () => void

  focusCell: (index: number) => void
}

// The row being typed: what stands in its cells, which helper records it
// chose, the suggestion list under the cursor and the calculations.
export class CaptureRow {
  private readonly host: CaptureRowHost

  private readonly typed = new Map<number, string>()

  private readonly chosen = new Map<string, unknown>()

  private readonly byHand = new Set<string>()

  private readonly list = new SuggestionState<Entry>()

  private computed = new Map<number, string>()

  private cursorColumn = -1

  constructor(host: CaptureRowHost) {
    this.host = host
  }

  get typingColumn(): number {
    return this.cursorColumn
  }

  get mark(): number {
    return this.list.mark
  }

  get suggestions(): readonly Entry[] {
    return this.list.hit
  }

  // Something was typed or chosen: there is a position to give up.
  get touched(): boolean {
    return this.chosen.size > 0 || [...this.typed.values()].some((text) => text !== '')
  }

  // What the capture row shows: one pass over the columns instead of one
  // question per cell.
  rowView(): { value: string; automatic: boolean }[] {
    const context = this.host.context()
    return context.columns.map((_, index) => {
      const typed = this.typed.get(index)
      const computed = typed === '' && this.computed.has(index)
      const value = this.valueIn(context, index)
      return { value, automatic: (typed === undefined || computed) && value !== '' }
    })
  }

  valueIn(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
    if (typed !== undefined && typed !== '') return typed
    return this.computed.get(index) ?? this.givenIn(context, index)
  }

  // What the cell holds before any sentence: the typed text, or the field of
  // the record chosen for its source.
  private givenIn(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
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
      this.settle(index)
      this.cursorColumn = -1
      this.list.idle()
    }
    this.host.report()
  }

  // A cell of a helper source holds a value of that source, never loose text:
  // what was typed takes the exact hit, or falls away.
  settle(index: number): void {
    const context = this.host.context()
    const typed = (this.typed.get(index) ?? '').trim()
    if (typed === '' || targetIn(context, index).kind !== 'linked') return
    const wanted = plainText(typed)
    const exact = this.entriesIn(context, index).filter((e) => plainText(e.value.trim()) === wanted)
    if (exact.length === 1) this.adopt(index, exact[0].record)
    else this.typed.delete(index)
  }

  empty(index: number): void {
    const context = this.host.context()
    this.typed.delete(index)
    const target = targetIn(context, index)
    if (target.sourceId !== '' && this.chosen.has(target.sourceId)) {
      this.choose(context, target.sourceId, undefined)
      this.syncChosen(context)
    }
    this.list.restart()
    this.host.report()
  }

  setMark(mark: number): void {
    this.list.setMark(mark)
    this.host.report()
  }

  decideKey(index: number, key: string): KeyAction {
    const context = this.host.context()
    const target = targetIn(context, index)
    const action = this.list.actionFor(key, {
      listOpen: this.cursorColumn === index && this.list.open,
      fieldEmpty: this.valueIn(context, index) === '',
      typed: this.typed.get(index) !== undefined,
      lookupable: target.kind === 'linked',
      hasRecords: () => this.entriesIn(context, index).length > 0,
      jumps: true,
    })
    // The key moved the mark or closed the list: what the operator sees is a
    // step further than the drawing.
    if (action !== 'nothing') this.host.report()
    return action
  }

  // Tab and Enter walk the cells the operator has to fill, the row first,
  // then its grey line: a cell that holds a value from the chosen record or
  // from a calculation is skipped, a click still enters it.
  neighbour(from: number, direction: 1 | -1): number {
    const view = this.rowView()
    const typed = walkOrder(this.host.layout()).filter((slot) => view[slot]?.automatic !== true)
    return neighbourSlot(typed, from, direction)
  }

  // The first cell of the capture row the operator sees.
  get firstCell(): number {
    return walkOrder(this.host.layout())[0] ?? 0
  }

  // What the lookup window of a cell shows. Nothing when the column names no
  // field of a helper source, or that source holds no rows.
  lookupAt(index: number): LookupSpot | null {
    const context = this.host.context()
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
    const context = this.host.context()
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
    const context = this.host.context()
    this.compute(context)
    this.list.show(this.suggestionsFor(context))
  }

  // The typed words are looked for in every column of the same source; what
  // equals the typed text stands on top, then what begins with it.
  private suggestionsFor(context: CaptureContext): Entry[] {
    const index = this.cursorColumn
    if (this.list.closed || targetIn(context, index).kind === 'free') return []
    const typed = this.typed.get(index) ?? ''
    if (typed === '') return []
    const codes = sameSourceCodes(context, index)
    const texts = (e: Entry): string[] => [
      e.display, e.value, ...codes.map((code) => maskState.host.readField(e.record, code)),
    ]
    const entries = this.entriesIn(context, index)
    const hit = typed.trim() === '' ? entries : entries.filter((e) => rowFits(texts(e), typed))
    return orderedSuggestions(hit, typed, texts)
  }

  typedAt(index: number): string {
    return this.typed.get(index) ?? ''
  }

  // The columns the hits of a cell stand in: those of its lookup window.
  windowColumnsAt(index: number): Column[] {
    const context = this.host.context()
    const own = windowColumnsIn(context, index)
    if (own.length > 0) return own
    const target = targetIn(context, index)
    return automaticColumns({ storageField: target.code, storageTitle: context.columns[index]?.title ?? '' })
  }

  // The sentences run over the row as the operator gave it; a helper field
  // reads from the record chosen for that source.
  compute(context: CaptureContext): void {
    this.computed = rowValues(
      context.calculations,
      (key) => columnWithKey(context.columns, key),
      (slot) => this.givenIn(context, slot),
      (sourceId, field) => {
        const record = this.chosen.get(sourceId ?? context.sourceId)
        return record === undefined ? '' : maskState.host.readField(record, field)
      },
    )
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

  // A captured row comes back into the capture row, with the helper records
  // it was captured with.
  adoptRow(context: CaptureContext, values: readonly string[], helpers: Helpers): void {
    this.clear()
    values.forEach((value, index) => {
      if (value !== '') this.typed.set(index, value)
    })
    for (const [sourceId, record] of helpers.chosen) this.choose(context, sourceId, record)
    for (const sourceId of helpers.byHand) this.byHand.add(sourceId)
    this.yieldToComputed(context)
    this.compute(context)
  }

  private yieldToComputed(context: CaptureContext): void {
    const slots = columnSlots(
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

  // The helper records as they stand now, for the row being captured.
  helpersNow(): Helpers {
    return { chosen: new Map(this.chosen), byHand: new Set(this.byHand) }
  }

  clear(): void {
    this.typed.clear()
    this.chosen.clear()
    this.byHand.clear()
    this.computed.clear()
    this.cursorColumn = -1
    this.list.idle()
  }
}
