import { html, render, type TemplateResult } from 'lit'
import { BLOCK_ID_ATTR } from '../../core/data/actions'
import type { ListBinding } from '../../core/block/listBinding'
import { fieldRead } from '../../softengine/data'
import { runtimeSource, rowsTheSource } from '../../softengine/runtimeSources'
import { rowsToSelection } from './selection'
import {
  DIALOG_SIZE_EVENT,
  DIALOG_FRAME_TAG,
  type DialogSizeDetail,
  type DialogFrame,
} from './DialogFrame'
import { rememberedSorting, sortIndizes } from './sorting'
import { coerceColumns, STANDARD_TITLE, type Column } from './columns'
import { fittingSuggestions, SUGGESTIONS_MAX, type Suggestion } from './suggestionList'
import {
  ROW_ACTIVATED_EVENT,
  type RowActivatedDetail,
} from './rowActivation'

import '../table/Table'

const WINDOW_TABLE_TAG = 'ff-table'

interface WindowTable extends HTMLElement {
  setSearchText: (text: string) => void
  focusSearch: () => boolean
  updateComplete: Promise<boolean>
}

export function magnifierIcon(): TemplateResult {
  return html`<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
      <line x1="10.4" y1="10.4" x2="14" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></line>
    </svg>`
}

function lookupKey(el: HTMLElement, spot = 'field'): string {
  return `${el.getAttribute(BLOCK_ID_ATTR) ?? ''}/nachschlagen/${spot}`
}

function lookupColumns(columns: readonly Column[]): Column[] {
  return coerceColumns(columns.map((s) => ({ ...s, key: s.key || `feld:${s.field}` })))
}

export function suggestionsInWindowState<T extends Suggestion & { record: unknown }>(
  entries: readonly T[], typed: string, columns: readonly Column[],
  el?: HTMLElement, spot?: string,
): T[] {
  const hit = typed.trim() === '' ? [...entries]
    : fittingSuggestions(entries, typed, Infinity, true)
  const state = el === undefined ? null : rememberedSorting.read(el, lookupKey(el, spot))
  const column = state === null ? undefined
    : lookupColumns(columns).find((s) => s.key === state.key)

  if (column !== undefined && state !== null) {
    const values = hit.map((e) => [fieldRead(e.record, column.field)])
    return sortIndizes(values, 0, state.on).slice(0, SUGGESTIONS_MAX).map((i) => hit[i])
  }
  return hit.slice(0, SUGGESTIONS_MAX)
}

export const WINDOW_WIDTH = 520
export const WINDOW_HEIGHT = 380

const WINDOW_MIN = 120
const WINDOW_MAX = 2000

export function validMetrics(v: unknown, standard: number): number {
  if (v === undefined || v === null || v === '') return standard
  const number = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(number)) return standard
  return Math.min(WINDOW_MAX, Math.max(WINDOW_MIN, Math.round(number)))
}

export function windowWidthFor(columns: number): number {
  return Math.min(900, Math.max(WINDOW_WIDTH, 160 + 180 * columns))
}

export const LOOKUP_COLUMNS_BINDING: ListBinding = {
  prop: 'lookupColumns',
  titleKey: 'title',
  fieldKey: 'field',
  standardTitle: STANDARD_TITLE,
  sourceProp: 'lookupSource',
}

export function coerceLookupColumns(v: unknown): Column[] {
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return []
    }
  }
  return Array.isArray(v) && v.length > 0 ? coerceColumns(v) : []
}

export function windowColumnsOr(provided: unknown, automatic: () => Column[]): Column[] {
  const own = coerceLookupColumns(provided)
  return own.length > 0 ? own : automatic()
}

export interface LookupArgs {
  spot?: string
  el: HTMLElement
  sourceId: string
  storageField: string
  storageTitle: string

  columns: readonly Column[]
  title: string

  width: number
  height: number
  onAdopt: (display: string, value: string, record: unknown) => void

  entries?: readonly Entry[]

  backFocus?: HTMLElement | (() => void) | null

  searchText?: string

  inEditor?: boolean

  setMetrics?: (axis: 'width' | 'height', value: number | undefined) => void
}

export interface Entry {
  display: string
  value: string

  record: unknown
}

export interface LookupSetting {
  el: HTMLElement
  sourceId: string
  storageField: string

  columns: readonly Column[]
}

function displayFieldOf(columns: readonly Column[], storageField: string): string {
  const first = columns[0]
  return first === undefined ? storageField : first.field
}

function onlyOneColumn(displayField: string, storageField: string): boolean {
  const display = displayField.trim()
  return display === '' || display === storageField.trim()
}

export function lookupEntries(
  rows: readonly unknown[],
  displayField: string,
  storageField: string,
): Entry[] {
  const displayCode = displayField.trim()
  const entries: Entry[] = []
  const singleColumn = onlyOneColumn(displayField, storageField)
  const seen = new Set<string>()
  for (const row of rows) {
    const value = fieldRead(row, storageField).trim()
    const display = displayCode === '' ? value : fieldRead(row, displayCode).trim()
    if (display === '' && value === '') continue
    if (singleColumn) {
      if (seen.has(value)) continue
      seen.add(value)
    }
    entries.push({ display, value, record: row })
  }
  return entries
}

function windowEntries(
  el: HTMLElement,
  rows: unknown[],
  displayField: string,
  storageField: string,
): Entry[] {
  return lookupEntries(rowsToSelection(el, rows).rows, displayField, storageField)
}

export type EntriesResult =
  | { ok: true; entries: Entry[] }
  | { ok: false }

export function sourcesRows(sourceId: string): unknown[] | null {
  const source = runtimeSource(sourceId)
  if (!source) return null
  return rowsTheSource(source)
}

export function holeEntries(e: LookupSetting): EntriesResult {
  if (e.sourceId === '' || e.storageField === '') return { ok: false }
  const rows = sourcesRows(e.sourceId)
  if (rows === null) return { ok: false }
  const displayField = displayFieldOf(coerceLookupColumns([...e.columns]), e.storageField)
  return { ok: true, entries: windowEntries(e.el, rows, displayField, e.storageField) }
}

export function onlyHitFind(
  entries: readonly Entry[],
  fieldEmpty: boolean,
): Entry | null {
  return fieldEmpty && entries.length === 1 ? entries[0] : null
}

export function recordFitsToSelection(el: HTMLElement, record: unknown): boolean {
  const { rows, filtered } = rowsToSelection(el, [record])
  return !filtered || rows.length > 0
}

export type LeaveFollow = 'nothing' | 'clear' | 'back'

export function followOnLeave(
  typed: string,

  confirmedDisplay: string,
  confirmedValue: string,
): LeaveFollow {
  if (typed === '') {
    return confirmedDisplay === '' && confirmedValue === '' ? 'nothing' : 'clear'
  }
  return typed === confirmedDisplay ? 'nothing' : 'back'
}

let open: HTMLElement | null = null
let openFor: HTMLElement | null = null
let backFocus: HTMLElement | (() => void) | null = null

function magnifierOf(el: HTMLElement): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('.lupe') ?? null
}

function close(withFocus = true): void {
  const target = withFocus ? backFocus : null
  backFocus = null
  open?.remove()
  open = null
  openFor = null
  if (typeof target === 'function') target()
  else target?.focus()
}

export function closeLookupFor(el: HTMLElement): void {
  if (openFor === el) close(false)
}

type ColumnsSource = Pick<LookupArgs, 'storageField' | 'storageTitle'>

export function automaticColumns(args: ColumnsSource): Column[] {
  const title = args.storageTitle !== '' ? args.storageTitle : 'Wert'
  return [{ key: `feld:${args.storageField}`, title, field: args.storageField }]
}

function runtimeTableTpl(args: LookupArgs, entries: readonly Entry[]): TemplateResult {
  const own = coerceLookupColumns([...args.columns])
  const columns = lookupColumns(windowColumnsOr(own, () => automaticColumns(args)))

  if (args.inEditor === true) {
    return html`<ff-table
      data-ff-editor
      fills
      search="true"
      columnpicker="true"
      style="--se-r-lg:0px"
      .rowsFrom=${'handed'}
      .columns=${columns}
    ></ff-table>`
  }

  const singleColumn = onlyOneColumn(
    displayFieldOf(own, args.storageField),
    args.storageField,
  )

  return html`<ff-table
    data-ff-block-id=${lookupKey(args.el, args.spot)}
    fills
    search="true"
    columnpicker="true"
    style="--se-r-lg:0px"
    .rowsFrom=${'handed'}
    .columns=${columns}
    .handedRows=${entries.map((e) => ({
      rawRow: e.record,
      cells: own.length > 0
        ? own.map((s) => (s.field === '' ? '' : fieldRead(e.record, s.field)))
        : (singleColumn ? [e.value] : [e.display, e.value]),
    }))}
  ></ff-table>`
}

function wireDrag(dialog: DialogFrame, args: LookupArgs): void {
  dialog.addEventListener(DIALOG_SIZE_EVENT, (event) => {
    const detail = (event as CustomEvent<DialogSizeDetail>).detail
    if (detail.gesture === 'standard') {
      args.setMetrics?.(detail.axis, undefined)
      return
    }
    if (detail.axis === 'width') dialog.width = detail.value
    else dialog.height = detail.value
    if (detail.gesture === 'end') args.setMetrics?.(detail.axis, detail.value)
  })
}

export function openLookup(args: LookupArgs): void {
  let entries = args.entries

  if (entries === undefined && args.inEditor !== true) {
    const result = holeEntries(args)
    if (!result.ok) return
    entries = result.entries
  }

  const found = entries ?? []

  close(false)

  const holder = document.createElement('div')
  holder.style.display = 'contents'
  render(html`<ff-dialog
    viewport
    escape-closes
    data-ff-lookup
    ?movable=${args.inEditor === true}
    .heading=${args.title !== '' ? args.title : 'Nachschlagen'}
    .width=${args.width}
    .height=${args.height}
    @ff-dialog-close=${() => close()}
    @click=${(e: Event) => e.stopPropagation()}
  >${runtimeTableTpl(args, found)}</ff-dialog>`, holder)

  const dialog = holder.querySelector<DialogFrame>(DIALOG_FRAME_TAG)
  const table = holder.querySelector<WindowTable>(WINDOW_TABLE_TAG)
  if (dialog && args.inEditor === true) wireDrag(dialog, args)
  table?.addEventListener(ROW_ACTIVATED_EVENT, (event) => {
    const detail = (event as CustomEvent<RowActivatedDetail>).detail
    const entry = found[detail.rawIndex]
    if (!entry) return
    close()
    args.onAdopt(entry.display, entry.value, entry.record)
  })

  backFocus = args.backFocus ?? magnifierOf(args.el)
  document.body.appendChild(holder)
  open = holder
  openFor = args.el

  const brought = args.searchText ?? ''
  if (table && brought !== '') table.setSearchText(brought)

  if (dialog && table) {
    void Promise.all([dialog.updateComplete, table.updateComplete]).then(() => {
      if (dialog.isConnected) table.focusSearch()
    })
  }
}
