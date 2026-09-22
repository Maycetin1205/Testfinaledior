import { BLOCK_ID_ATTR } from '../../core/data/actions'
import { SELECTION_FOLLOW_PROP, type SelectionFollow } from '../../core/data/selectionFollow'
import { fieldRead } from '../../softengine/data'
import { pairListFromAttribut } from './pairList'

export function traitOf(row: unknown): string {
  if (row == null) return ''
  try {
    return JSON.stringify(row, (_key, value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value
      const isPlainObject = value as Record<string, unknown>
      return Object.fromEntries(Object.keys(isPlainObject).sort().map((key) => [key, isPlainObject[key]]))
    }) ?? ''
  } catch {
    return ''
  }
}

const state = new Map<string, { row: unknown; trait: string; number: number }>()
const listener = new Set<(byControls: boolean) => void>()

let choiceNumerator = 0

let messageRuns = false
let lateReport = false
let toControls = false

function report(byControls: boolean): void {
  if (messageRuns) {
    lateReport = true
    toControls ||= byControls
    return
  }
  messageRuns = true
  let origin = byControls
  try {
    do {
      lateReport = false
      toControls = false
      listener.forEach((cb) => cb(origin))
      origin = toControls
    } while (lateReport)
  } finally {
    messageRuns = false
  }
}

export function onSelectionList(cb: (byControls: boolean) => void): void {
  listener.add(cb)
}

export function selectionFor(giverId: string): unknown | undefined {
  return state.get(giverId)?.row
}

function selectionTrait(giverId: string): string {
  return state.get(giverId)?.trait ?? ''
}

export function selectionNumber(giverId: string): number {
  return state.get(giverId)?.number ?? 0
}

export function giverIdOf(el: Element): string {
  return el.getAttribute(BLOCK_ID_ATTR) ?? ''
}

export function selectionRefind<T>(
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
  if (hit.length === 0) plainSelection(giverId)
  else {
    const old = state.get(giverId)
    const row = rowOf(candidates[hit[0]])
    if (old && traitOf(old.row) !== traitOf(row)) {
      state.set(giverId, { ...old, row })
      report(false)
    }
  }
  return hit
}

export function chooseSelection(giverId: string, row: unknown, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  const old = state.get(giverId)
  if (old && old.trait === trait) state.delete(giverId)
  else state.set(giverId, { row, trait, number: ++choiceNumerator })
  report(true)
}

export function setSelection(giverId: string, row: unknown, byControls = false, key = ''): void {
  if (giverId === '') return
  const trait = key || traitOf(row)
  if (trait === '') return
  if (state.get(giverId)?.trait === trait) return
  state.set(giverId, { row, trait, number: ++choiceNumerator })
  report(byControls)
}

export function plainSelection(giverId: string): void {
  if (!state.has(giverId)) return
  state.delete(giverId)
  report(false)
}

const SELECTION_FOLLOW_ATTR = SELECTION_FOLLOW_PROP.toLowerCase()

function followsFromAttribut(el: HTMLElement): SelectionFollow[] {
  return pairListFromAttribut(el, SELECTION_FOLLOW_ATTR, 'giverId')
    .map((e) => ({ giverId: e.id, pairs: e.pairs }))
}

export function selectionGiverOf(el: HTMLElement): string[] {
  return followsFromAttribut(el).map((f) => f.giverId).filter((id) => id !== '')
}

export function rowsToSelection(
  el: HTMLElement,
  rows: unknown[],
): { rows: unknown[]; filtered: boolean } {
  let out = rows
  let filtered = false
  for (const follow of followsFromAttribut(el)) {
    const selection = selectionFor(follow.giverId)
    if (selection === undefined) continue

    const activePairs = follow.pairs
      .map((p) => ({ should: fieldRead(selection, p.ofField), toField: p.toField }))
      .filter((p) => p.should !== '')

    if (activePairs.length === 0) continue

    filtered = true
    out = out.filter((row) =>
      activePairs.every((p) => p.should === fieldRead(row, p.toField)),
    )
  }
  return { rows: out, filtered }
}

export function firstRowToSelection(el: HTMLElement, rows: unknown[]): unknown {
  if (followsFromAttribut(el).length === 0) return rows[0]
  const { rows: fitting, filtered } = rowsToSelection(el, rows)
  return filtered ? fitting[0] : undefined
}
