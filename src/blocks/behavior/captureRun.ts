import {
  lookupEntries,
  sourcesRows,
  type Entry,
} from './lookup'
import { fieldRead } from '../../softengine/data'
import { suggestionsInWindowState } from './lookup'
import { SuggestionState, type KeysFollow } from './suggestionState'
import {
  allFactors,
  calculationFlaws,
  resultSlots,
  computeRow,
  type Calculation,
  type Factor,
  type FactorState,
} from '../../core/data/calculation'
import { splitBinding } from '../../core/block/binding'
import { asNumber } from './sorting'
import { columnWithKey } from './columns'
import {
  displayColumnIn,
  windowColumnsIn,
  fittingRecords,
  linkedSourcesIn,
  cellTargetOf,
  targetIn,
  type CaptureContext,
} from './captureRow'

export class CaptureRun {
  private typed = new Map<number, string>()

  private chosen = new Map<string, unknown>()

  private ofHand = new Set<string>()

  private _typingColumn = -1

  private _listOn = -1

  private readonly list = new SuggestionState<Entry>()

  private _computed = new Map<number, string>()

  private _hints: string[] = []

  get hints(): readonly string[] {
    return this._hints
  }

  get typingColumn(): number {
    return this._typingColumn
  }

  get mark(): number {
    return this.list.mark
  }

  get suggestions(): readonly Entry[] {
    return this.list.hit
  }

  valueAt(context: CaptureContext, index: number): string {
    const typed = this.typed.get(index)
    if (typed !== undefined && typed !== '') return typed
    const computed = this._computed.get(index)
    if (computed !== undefined) return computed
    if (typed !== undefined) return typed
    const target = targetIn(context, index)
    if (target.sourceId === '' || target.code === '') return ''
    const record = this.chosen.get(target.sourceId)
    return record === undefined ? '' : fieldRead(record, target.code)
  }

  compute(context: CaptureContext): void {
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
    this._computed = new Map([...row.values].map(([slot, value]) => [slot, value.text]))
    this._hints = []
    for (const calculation of context.calculations) {
      const placement = row.placements.get(calculation.key)
      if (placement === undefined || (placement.kind !== 'widerspruch' && placement.kind !== 'incomplete')) continue

      if (!this.groupTouched(context, calculation)) continue
      if (!this._hints.includes(placement.text)) this._hints.push(placement.text)
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
      return this.textState(fieldRead(record, code))
    }
    const slot = columnWithKey(context.columns, factor.column)
    if (slot === -1) return { kind: 'empty' }
    const typed = this.typed.get(slot)
    if (typed !== undefined && typed.trim() !== '') return this.textState(typed)

    if (typed !== undefined) return { kind: 'empty' }
    const target = targetIn(context, slot)
    if (target.sourceId === '' || target.code === '') return { kind: 'empty' }
    const record = this.chosen.get(target.sourceId)
    if (record === undefined) return { kind: 'empty' }
    return this.textState(fieldRead(record, target.code))
  }

  private textState(raw: string): FactorState {
    const t = raw.trim()
    if (t === '') return { kind: 'empty' }
    const number = asNumber(t)
    return number === null ? { kind: 'ungueltig', text: t } : { kind: 'number', number }
  }

  type(index: number, text: string): void {
    this.typed.set(index, text)
    this._typingColumn = index
    this.list.ofFront()
  }

  leave(index: number): void {
    if (this._typingColumn !== index) return
    this._typingColumn = -1
    this._listOn = -1
    this.list.idle()
  }

  isAutomatic(context: CaptureContext, index: number): boolean {
    const typed = this.typed.get(index)
    const computed = typed === '' && this._computed.has(index)
    return (typed === undefined || computed) && this.valueAt(context, index) !== ''
  }

  decideKey(context: CaptureContext, index: number, key: string): KeysFollow {
    const target = targetIn(context, index)
    const follow = this.list.followFor(key, {
      listOpen: this._typingColumn === index && this.list.open,
      fieldEmpty: this.valueAt(context, index) === '',
      typed: this.typed.get(index) !== undefined,
      lookupable: target.kind === 'verknuepft',
      hasRecords: () => this.entries(context, index).length > 0,
      jumps: true,
    })
    if (follow === 'liste-zu') this._listOn = -1
    return follow
  }

  openList(index: number): void {
    this._typingColumn = index
    this._listOn = index
    this.list.openList()
  }

  nextEmpty(context: CaptureContext, off: number): number {
    for (let i = off + 1; i < context.columns.length; i++) {
      if (context.columns[i]?.hidden === true) continue
      if (this.valueAt(context, i) === '') return i
    }
    return -1
  }

  neighbourSlot(context: CaptureContext, off: number, direction: 1 | -1): number {
    for (let i = off + direction; i >= 0 && i < context.columns.length; i += direction) {
      if (context.columns[i]?.hidden !== true) return i
    }
    return -1
  }

  empty(context: CaptureContext, index: number): void {
    this.typed.delete(index)
    const target = targetIn(context, index)
    if (target.sourceId !== '' && this.chosen.has(target.sourceId)) {
      this.set(context, target.sourceId, undefined)
    }
    this.list.ofFront()
  }

  setMark(mark: number): void {
    this.list.setMark(mark)
  }

  adopt(context: CaptureContext, index: number, record: unknown): void {
    const target = targetIn(context, index)
    if (target.sourceId === '') return
    this.set(context, target.sourceId, record)
    this.ofHand.add(target.sourceId)
    if (target.kind === 'own') {
      for (const id of [...this.chosen.keys()]) {
        if (id !== target.sourceId) this.set(context, id, undefined)
      }
    }
    this.sameOff(context)
    this._typingColumn = -1
    this.list.idle()
  }

  private set(context: CaptureContext, sourceId: string, record: unknown): void {
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
            this.set(context, sourceId, undefined)
            moved = true
          }
          continue
        }
        if (!pairs.some((p) => this.keyValue(context, partnerId, p.ofField, sourceId) !== undefined)) continue
        const rows = sourcesRows(sourceId)
        if (rows === null) continue
        const fitting = this.possible(context, sourceId, rows)
        if (fitting.length === 1) {
          this.set(context, sourceId, fitting[0])
          this.ofHand.delete(sourceId)
          moved = true
        }
      }
      if (!moved) break
    }
  }

  adoptValues(context: CaptureContext, values: readonly string[]): void {
    this.reset()
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
      if (this._computed.get(index) !== value) this.typed.set(index, value)
    }
  }

  reset(): void {
    this.typed.clear()
    this.chosen.clear()
    this.ofHand.clear()
    this._computed.clear()
    this._hints = []
    this._typingColumn = -1
    this._listOn = -1
    this.list.idle()
  }

  refreshSuggestions(context: CaptureContext): void {
    this.compute(context)
    this.list.show(this.suggestionsFor(context))
  }

  private suggestionsFor(context: CaptureContext): Entry[] {
    const index = this._typingColumn
    if (this.list.closed || targetIn(context, index).kind === 'free') return []
    const typed = this.typed.get(index) ?? ''
    if (typed === '') {
      if (this._listOn !== index) return []
    }
    return suggestionsInWindowState(this.entries(context, index), typed,
      windowColumnsIn(context, index), context.block, context.columns[index]?.key)
  }

  entries(context: CaptureContext, index: number): Entry[] {
    const target = targetIn(context, index)
    if (target.kind !== 'verknuepft' || target.sourceId === '' || target.code === '') return []
    const rows = sourcesRows(target.sourceId)
    if (rows === null) return []
    const records = this.possible(context, target.sourceId, rows)
    return lookupEntries(records, displayColumnIn(context, index)?.code ?? '', target.code)
  }
}
