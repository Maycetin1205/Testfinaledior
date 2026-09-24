import { chainsRead } from '../../core/data/actions'
import {
  selectionFor,
  giverIdOf,
  chooseSelection,
  setSelection,
} from '../../runtime/selection'
import { runEvent } from '../../runtime/events'
import { rowsIndexOf, rowsTraitOf } from './sourceRows'

export const ROW_ACTIVATED_EVENT = 'ff-row-activate'

export const ROW_CHOSEN = 'rowChosen'
export const ROW_DOUBLE = 'rowDouble'
export const KEY_F4 = 'keyF4'

export interface RowActivatedDetail {
  rawRow: unknown

  rawIndex: number

  viewIndex: number
}

const RAW_ATTR = 'data-ff-raw'

function sendRowActivated(el: HTMLElement, detail: RowActivatedDetail): void {
  el.dispatchEvent(new CustomEvent<RowActivatedDetail>(ROW_ACTIVATED_EVENT, {
    detail,
    bubbles: true,
    composed: true,
  }))
}

export class RowsChoice {
  private readonly block: HTMLElement

  private ownTrait = ''

  private lastSlot: { rows: readonly unknown[]; trait: string; slot: number } | null = null

  constructor(block: HTMLElement) {
    this.block = block
  }

  private get giverId(): string {
    return giverIdOf(this.block)
  }

  private get trait(): string {
    const id = this.giverId
    return id === '' ? this.ownTrait : rowsTraitOf(this.block, selectionFor(id))
  }

  slotIn(rows: readonly unknown[]): number {
    const trait = this.trait
    if (trait === '') return -1
    const last = this.lastSlot
    if (last !== null && last.rows === rows && last.trait === trait) {
      return last.slot
    }
    const slot = rows.findIndex((row) => rowsTraitOf(this.block, row) === trait)
    this.lastSlot = { rows, trait, slot }
    return slot
  }

  toggle(row: unknown): boolean {
    const trait = rowsTraitOf(this.block, row)
    const id = this.giverId
    if (id === '') {
      this.ownTrait = this.ownTrait === trait ? '' : trait
      return this.ownTrait !== ''
    }
    chooseSelection(id, row, trait)
    return trait !== '' && rowsTraitOf(this.block, selectionFor(id)) === trait
  }

  forget(): void {
    this.ownTrait = ''
    this.lastSlot = null
  }
}

export function focusedRawIndex(root: ShadowRoot | null): number | null | undefined {
  const active = root?.activeElement
  if (!(active instanceof HTMLElement)) return undefined
  const row = active.closest<HTMLElement>('.row')
  if (!row) return undefined
  const raw = row.getAttribute(RAW_ATTR)
  return raw === null || raw === '' ? null : Number(raw)
}

export function moveRowsFocus(from: EventTarget | null, direction: number): boolean {
  if (!(from instanceof HTMLElement)) return false
  const row = from.closest<HTMLElement>('.row')
  const body = row?.parentElement
  if (!row || !body) return false
  const rows = [...body.querySelectorAll<HTMLElement>(`.row[${RAW_ATTR}]`)]
  const at = rows.indexOf(row)
  const target = at === -1 ? undefined : rows[at + direction]
  if (!target) return false
  target.focus()
  target.scrollIntoView?.({ block: 'nearest' })
  return true
}

export function focusFirstRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const first = from.closest<HTMLElement>('.table')
    ?.querySelector<HTMLElement>(`.row[${RAW_ATTR}]`)
  if (!first) return false
  first.focus()
  return true
}

export function focusSearchRow(from: EventTarget | null): boolean {
  if (!(from instanceof HTMLElement)) return false
  const field = from.closest<HTMLElement>('.table')
    ?.querySelector<HTMLInputElement>('.search-row input')
  if (!field) return false
  field.focus()
  return true
}

export function restoreRowsFocus(root: ShadowRoot | null, rawIndex: number | null): void {
  if (!root) return
  const wanted = rawIndex === null
    ? null
    : root.querySelector<HTMLElement>(`.row[${RAW_ATTR}="${rawIndex}"]`)
  const target = wanted
    ?? root.querySelector<HTMLElement>(`.row[${RAW_ATTR}]`)
    ?? root.querySelector<HTMLElement>('.body')
  target?.focus()
}

export function activateRow(
  el: HTMLElement,
  choice: RowsChoice,
  rawRows: readonly unknown[],
  rawIndex: number | null,
  viewIndex: number,
): void {
  if (rawIndex === null || el.hasAttribute('data-ff-editor')) return
  const rawRow = rawRows[rawIndex]
  if (rawRow === undefined) return

  if (!choice.toggle(rawRow)) {
    sendRowActivated(el, { rawRow, rawIndex: -1, viewIndex })
    return
  }
  sendRowActivated(el, { rawRow, rawIndex, viewIndex })
  runEvent(el, ROW_CHOSEN, { PINDEX: rowsIndexOf(el, rawRow) })
    .catch(() => {})
}

export function rowDouble(
  el: HTMLElement,
  rawRows: readonly unknown[],
  rawIndex: number | null,
): void {
  if (rawIndex === null || el.hasAttribute('data-ff-editor')) return
  const rawRow = rawRows[rawIndex]
  if (rawRow === undefined) return
  runEvent(el, ROW_DOUBLE, { PINDEX: rowsIndexOf(el, rawRow) })
    .catch(() => {})
}

export interface ActionRowElement extends HTMLElement {
  inEditor: boolean
  rawRows: unknown[]
}

// F4 runs the action chain at the row the operator stands on: the focused one,
// else the chosen one.
export function actionKeyAtRow(
  el: ActionRowElement,
  choice: RowsChoice,
  e: KeyboardEvent,
): void {
  if (el.inEditor || e.defaultPrevented || e.key !== 'F4'
    || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  if (!chainsRead(el.getAttribute('data-ff-actions'))[KEY_F4]?.length) return
  e.preventDefault()
  e.stopPropagation()
  if (e.repeat) return

  const focus = focusedRawIndex(el.shadowRoot)
  const slot = focus === undefined ? choice.slotIn(el.rawRows) : focus
  const row = slot === null ? undefined : el.rawRows[slot]
  if (row === undefined) return
  setSelection(giverIdOf(el), row, true, rowsTraitOf(el, row))
  const record = rowsIndexOf(el, row)
  runEvent(el, KEY_F4, { PINDEX: record, DROP_PINDEX: record }).catch(() => {})
}
