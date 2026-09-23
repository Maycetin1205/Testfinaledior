import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import type { Suggestion } from '../behavior/suggestionList'
import { inputSpotTpl } from '../behavior/inputSpot'
import { cellsClass } from './cells'
import { windowColumnsOr } from '../behavior/lookup'
import { asNumber } from '../behavior/sorting'
import { CELL_PLACEHOLDER, type Column } from '../behavior/columns'
import type { CaptureColumn } from './column'
import { splitBinding } from '../../core/block/blockType'
import type { Calculation } from '../../core/data/calculation'
import type { KeyPair } from '../../core/data/extraSources'
import { leftOf } from '../behavior/foreignSources'
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
  tun: CaptureAct,
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
        klasse: cellsClass(placement.automatic(slot) ? 'automatic' : 'quiet'),
        holderClass: 'cell-holder',
        slot,
        suggestions: list ? placement.suggestions : [],
        mark: placement.mark,
        listToTop: placement.listToTop,
      }, {
        typing: (text) => tun.typing(slot, text),
        key: (e) => tun.key(slot, e),
        leave: () => tun.leave(slot),
        chooseSuggestion: (i2) => tun.chooseSuggestion(i2),
        setMark: (i2) => tun.setMark(i2),
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
  const left = leftOf(block)
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
  off: number,
  direction: 1 | -1,
): number {
  for (let i = off + direction; i >= 0 && i < columns.length; i += direction) {
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
  return [{ key: `feld:${target.code}`, title: context.columns[index]?.title ?? '', field: target.code }]
}

export function fittingRecords(
  pairs: readonly KeyPair[],
  keyValue: (field: string) => string | undefined,
  candidates: readonly unknown[],
): unknown[] {
  const known = pairs
    .map((p) => ({ toField: p.toField, should: keyValue(p.ofField) }))
    .filter((b): b is { toField: string; should: string } => b.should !== undefined)
  if (known.length === 0) return [...candidates]
  return candidates.filter((record) => known.every(
    (b) => b.should !== '' && b.should === fieldRead(record, b.toField),
  ))
}
