import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { Suggestion } from '../lookup/suggestionList'
import { inputSpotTpl } from '../lookup/inputSpot'
import { cellsClass } from './cells'
import { windowColumnsOr } from '../lookup/lookup'
import { asNumber } from '../list/sorting'
import { CELL_PLACEHOLDER, FIELD_KEY_PREFIX, type Column } from '../list/columns'
import type { CaptureColumn } from './column'
import { splitBinding } from '../../core/block/blockType'
import type { Calculation } from '../../core/data/calculation'
import type { KeyPair } from '../../core/data/extraSources'
import { extraSourcesOf } from '../../runtime/foreignSources'
import { fieldRead } from '../../softengine/data'

export interface CapturePlacement {
  columns: readonly Column[]
  slots: readonly number[]

  sourceId: string

  cols: Readonly<Record<string, string>>

  inEditor: boolean

  titleInCell: boolean

  value: (index: number) => string

  automatic: (index: number) => boolean

  typingColumn: number
  suggestions: readonly Suggestion[]
  mark: number

  listToTop: boolean
}

export interface CaptureAct {
  typing: (index: number, text: string) => void
  key: (index: number, e: KeyboardEvent) => void
  leave: (index: number) => void

  chooseSuggestion: (listIndex: number) => void
  setMark: (listIndex: number) => void
}

export function captureRowTpl(
  placement: CapturePlacement,
  act: CaptureAct,
): TemplateResult {
  return html`<div class="row capture" role="row" style=${styleMap(placement.cols)}>
    ${placement.columns.map((column, i) => {
      if (placement.inEditor) {
        return html`<div
          class=${column.hidden === true ? 'hidden' : nothing}
          role="cell"
        ><span class="cell-label">${
          placement.titleInCell ? column.title || CELL_PLACEHOLDER : ''
        }</span></div>`
      }
      const slot = placement.slots[i]

      const free = cellTargetOf(column, placement.sourceId).kind === 'free'
      const list = !free && placement.typingColumn === slot
      const value = placement.value(slot)

      return html`<div
        class=${asNumber(value) !== null ? 'number' : nothing}
        role="cell"
      >${inputSpotTpl({
        value,
        title: column.title,
        placeholder: placement.titleInCell ? column.title : '',
        inputClass: cellsClass(placement.automatic(slot) ? 'automatic' : 'quiet'),
        holderClass: 'cell-holder',
        slot,
        suggestions: list ? placement.suggestions : [],
        mark: placement.mark,
        listToTop: placement.listToTop,
      }, {
        typing: (text) => act.typing(slot, text),
        key: (e) => act.key(slot, e),
        leave: () => act.leave(slot),
        chooseSuggestion: (i2) => act.chooseSuggestion(i2),
        setMark: (i2) => act.setMark(i2),
      })}</div>`
    })}
  </div>`
}

export type CellKind = 'free' | 'own' | 'linked'

export interface CellTarget {
  kind: CellKind

  sourceId: string

  code: string
}

export interface CaptureContext {
  block?: HTMLElement
  columns: readonly CaptureColumn[]

  calculations: readonly Calculation[]

  sourceId: string

  pairsTo: (sourceId: string) => readonly KeyPair[]

  partnerOf: (sourceId: string) => string
}

export function cellTargetOf(
  column: CaptureColumn | undefined,
  tablesSourceId: string,
): CellTarget {
  const fill = (column?.fillField ?? '').trim()
  const field = fill !== '' ? fill : (column?.field ?? '').trim()
  if (field === '') return { kind: 'free', sourceId: '', code: '' }
  const { sourceId, code } = splitBinding(field)
  if (sourceId === '') return { kind: 'own', sourceId: tablesSourceId, code }
  return { kind: 'linked', sourceId, code }
}

// What the capture reads a cell against: its own columns, its own source and
// the helper sources standing left of it.
export function captureContext(
  block: HTMLElement,
  columns: readonly CaptureColumn[],
  sourceId: string,
  calculations: readonly Calculation[],
): CaptureContext {
  const left = extraSourcesOf(block)
  return {
    block,
    columns,
    calculations,
    sourceId,
    pairsTo: (id) => left.find((v) => v.sourceId === id)?.pairs ?? [],
    partnerOf: (id) => left.find((v) => v.sourceId === id)?.partnerId ?? '',
  }
}

export function targetIn(context: CaptureContext, index: number): CellTarget {
  return cellTargetOf(context.columns[index], context.sourceId)
}

// The next column left or right that the operator can see; a hidden one is
// stepped over.
export function neighbourSlot(
  columns: readonly CaptureColumn[],
  from: number,
  direction: 1 | -1,
): number {
  for (let i = from + direction; i >= 0 && i < columns.length; i += direction) {
    if (columns[i]?.hidden !== true) return i
  }
  return -1
}

export function linkedSourcesIn(context: CaptureContext): string[] {
  const out: string[] = []
  for (const column of context.columns) {
    const target = cellTargetOf(column, context.sourceId)
    if (target.kind !== 'linked' || target.sourceId === '') continue
    if (!out.includes(target.sourceId)) out.push(target.sourceId)
  }
  return out
}

export function displayColumnIn(
  context: CaptureContext,
  index: number,
): { title: string; code: string } | undefined {
  const target = targetIn(context, index)
  if (target.sourceId === '' || target.code === '') return undefined
  for (let i = 0; i < context.columns.length; i++) {
    if (i === index) continue
    const column = context.columns[i]
    const other = cellTargetOf(column, context.sourceId)
    if (other.sourceId !== target.sourceId) continue
    if (other.code === '' || other.code === target.code) continue
    return { title: column.title, code: other.code }
  }
  return undefined
}

export function windowColumnsIn(context: CaptureContext, index: number): Column[] {
  return windowColumnsOr(
    context.columns[index]?.windowColumns,
    () => automaticColumnsIn(context, index),
  )
}

function automaticColumnsIn(context: CaptureContext, index: number): Column[] {
  const target = targetIn(context, index)
  if (target.kind !== 'linked' || target.sourceId === '' || target.code === '') return []
  return [{ key: `${FIELD_KEY_PREFIX}${target.code}`, title: context.columns[index]?.title ?? '', field: target.code }]
}

export function fittingRecords(
  pairs: readonly KeyPair[],
  keyValue: (field: string) => string | undefined,
  candidates: readonly unknown[],
): unknown[] {
  const known = pairs
    .map((p) => ({ toField: p.toField, expected: keyValue(p.fromField) }))
    .filter((b): b is { toField: string; expected: string } => b.expected !== undefined)
  if (known.length === 0) return [...candidates]
  return candidates.filter((record) => known.every(
    (b) => b.expected !== '' && b.expected === fieldRead(record, b.toField),
  ))
}
