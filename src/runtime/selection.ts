import { BLOCK_ID_ATTR } from '../core/data/actions'
import { completePairs } from '../core/data/extraSources'
import {
  followsFromText,
  followUsable,
  SELECTION_FOLLOW_PROP,
  type SelectionFollow,
} from '../core/data/selectionFollow'
import { outsideValue } from './foreignSources'
import { maskState } from './maskState'

// Two deliveries of the same record may list their fields in a different order,
// so the trait sorts them before it compares.
export function traitOf(row: unknown): string {
  if (row == null) return ''
  try {
    return JSON.stringify(row, (_key, value: unknown) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
    }) ?? ''
  } catch {
    return ''
  }
}

function report(byControls: boolean): void {
  const selection = maskState.selection
  if (selection.messageRuns) {
    selection.lateReport = true
    selection.toControls ||= byControls
    return
  }
  selection.messageRuns = true
  let origin = byControls
  try {
    do {
      selection.lateReport = false
      selection.toControls = false
      selection.listeners.forEach((cb) => cb(origin))
      origin = selection.toControls
    } while (selection.lateReport)
  } finally {
    selection.messageRuns = false
  }
}

export function onSelectionList(cb: (byControls: boolean) => void): void {
  maskState.selection.listeners.add(cb)
}

export function selectionFor(giverId: string): unknown | undefined {
  return maskState.selection.chosen.get(giverId)?.row
}

function selectionTrait(giverId: string): string {
  return maskState.selection.chosen.get(giverId)?.trait ?? ''
}

export function selectionNumber(giverId: string): number {
  return maskState.selection.chosen.get(giverId)?.number ?? 0
}

export function giverIdOf(el: Element): string {
  return el.getAttribute(BLOCK_ID_ATTR) ?? ''
}

export function relocateSelection<T>(
  giverId: string,
  candidates: readonly T[],
  rowOf: (candidate: T) => unknown,
  keyFor?: (candidate: T) => string,
): number[] {
  if (giverId === '') return []
  const trait = selectionTrait(giverId)
  if (trait === '') return []
  const hit: number[] = []
  candidates.forEach((candidate, i) => {
    if ((keyFor?.(candidate) || traitOf(rowOf(candidate))) === trait) hit.push(i)
  })
  if (hit.length === 0) clearSelection(giverId)
  else {
    const chosen = maskState.selection.chosen
    const old = chosen.get(giverId)
    const row = rowOf(candidates[hit[0]])
    if (old && traitOf(old.row) !== traitOf(row)) {
      chosen.set(giverId, { ...old, row })
      report(false)
    }
  }
  return hit
}

export function chooseSelection(giverId: string, row: unknown, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  const selection = maskState.selection
  const old = selection.chosen.get(giverId)
  if (old && old.trait === trait) selection.chosen.delete(giverId)
  else selection.chosen.set(giverId, { row, trait, number: ++selection.counter })
  report(true)
}

export function setSelection(giverId: string, row: unknown, byControls = false, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  const selection = maskState.selection
  if (selection.chosen.get(giverId)?.trait === trait) return
  selection.chosen.set(giverId, { row, trait, number: ++selection.counter })
  report(byControls)
}

export function clearSelection(giverId: string): void {
  const chosen = maskState.selection.chosen
  if (!chosen.has(giverId)) return
  chosen.delete(giverId)
  report(false)
}

const SELECTION_FOLLOW_ATTR = SELECTION_FOLLOW_PROP.toLowerCase()

// The follows as the mask carries them, each with its complete pairs. A
// follow of a giver counts without pairs as well: its rows are fetched for the
// chosen row, or it waits for one.
function followsFromAttribute(el: HTMLElement): SelectionFollow[] {
  const raw = el.getAttribute(SELECTION_FOLLOW_ATTR) ?? ''
  if (raw === '') return []
  return followsFromText(raw)
    .filter((f) => f.giverId !== '' || followUsable(f))
    .map((f) => ({ giverId: f.giverId, pairs: completePairs(f) }))
}

export function selectionGiverOf(el: HTMLElement): string[] {
  return followsFromAttribute(el).map((f) => f.giverId).filter((id) => id !== '')
}

// Whether the block follows the value of this form field.
export function followsFormField(el: HTMLElement, blockId: string): boolean {
  return followsFromAttribute(el).some((f) => f.pairs.some((p) => p.from === 'formField' && p.fromField === blockId))
}

// The rows that fit what the block follows. Whoever follows shows nothing
// without it: no chosen row at the giver, or a key value missing, and an empty
// value counts as missing.
export function rowsToSelection(el: HTMLElement, rows: unknown[]): unknown[] {
  const host = maskState.host
  let out = rows
  for (const follow of followsFromAttribute(el)) {
    const selection = follow.giverId === '' ? undefined : selectionFor(follow.giverId)
    if (follow.giverId !== '' && selection === undefined) return []

    // A pair reads the giver's chosen row, the open document or a form field.
    const expected = follow.pairs.map((p) => outsideValue(p, el) ?? host.readField(selection, p.fromField))
    if (expected.some((value) => value.trim() === '')) return []

    out = out.filter((row) => follow.pairs.every((p, i) => expected[i] === host.readField(row, p.toField)))
  }
  return out
}

export function firstRowToSelection(el: HTMLElement, rows: unknown[]): unknown {
  return rowsToSelection(el, rows)[0]
}
