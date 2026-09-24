import { html, render } from 'lit'
import { BLOCK_ID_ATTR } from '../../core/data/actions'
import type { ListBinding } from '../../core/block/listBinding'
import { blockType } from '../../core/block/registry'
import { rowsToSelection } from '../../runtime/selection'
import { maskState } from '../../runtime/maskState'
import {
  DIALOG_SIZE_EVENT,
  DIALOG_FRAME_TAG,
  WINDOW_WIDTH,
  type DialogSizeDetail,
  type DialogFrame,
} from '../dialog/DialogFrame'
import { rememberedSorting, sortIndices } from '../list/sorting'
import { LOOKUP_KEY_PART } from '../list/operatorState'
import {
  coerceColumns,
  COLUMN_ACCESS,
  DEFAULT_TITLE,
  FIELD_KEY_PREFIX,
  type Column,
} from '../list/columns'
import { fittingSuggestions, SUGGESTIONS_MAX, type Suggestion } from './suggestionList'
import {
  ROW_ACTIVATED_EVENT,
  type RowActivatedDetail,
} from '../list/rowActivation'
import type { HandedRow, RowsFrom } from '../list/sourceRows'

// The block that opens a lookup brings the table block along.
const WINDOW_TABLE_TYPE = 'table'

interface WindowTable extends HTMLElement {
  preview: boolean
  rowsFrom: RowsFrom
  columns: Column[]
  handedRows: readonly HandedRow[]
  setSearchText: (text: string) => void
  focusSearch: () => boolean
  updateComplete: Promise<boolean>
}

function lookupKey(el: HTMLElement, spot = 'field'): string {
  return `${el.getAttribute(BLOCK_ID_ATTR) ?? ''}${LOOKUP_KEY_PART}${spot}`
}

function lookupColumns(columns: readonly Column[]): Column[] {
  return coerceColumns(columns.map((s) => ({ ...s, key: s.key || `${FIELD_KEY_PREFIX}${s.field}` })))
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
    const values = hit.map((e) => [maskState.host.readField(e.record, column.field)])
    return sortIndices(values, 0, state.ascending).slice(0, SUGGESTIONS_MAX).map((i) => hit[i])
  }
  return hit.slice(0, SUGGESTIONS_MAX)
}

const WINDOW_MIN = 120
const WINDOW_MAX = 2000

export function validMetrics(v: unknown, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback
  const number = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(number)) return fallback
  return Math.min(WINDOW_MAX, Math.max(WINDOW_MIN, Math.round(number)))
}

export function windowWidthFor(columns: number): number {
  return Math.min(900, Math.max(WINDOW_WIDTH, 160 + 180 * columns))
}

export const LOOKUP_COLUMNS_BINDING: ListBinding<Column> = {
  prop: 'lookupColumns',
  defaultTitle: DEFAULT_TITLE,
  sourceProp: 'lookupSource',
  entries: coerceLookupColumns,
  ...COLUMN_ACCESS,
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

interface LookupArgs {
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

  preview?: boolean

  setMetrics?: (axis: 'width' | 'height', value: number | undefined) => void
}

export interface Entry {
  display: string
  value: string

  record: unknown
}

interface LookupSetting {
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
    const value = maskState.host.readField(row, storageField).trim()
    const display = displayCode === '' ? value : maskState.host.readField(row, displayCode).trim()
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

type EntriesResult =
  | { ok: true; entries: Entry[] }
  | { ok: false }

export function sourcesRows(sourceId: string): unknown[] | null {
  const source = maskState.host.source(sourceId)
  if (!source) return null
  return maskState.host.rows(source)
}

export function fetchEntries(e: LookupSetting): EntriesResult {
  if (e.sourceId === '' || e.storageField === '') return { ok: false }
  const rows = sourcesRows(e.sourceId)
  if (rows === null) return { ok: false }
  const displayField = displayFieldOf(coerceLookupColumns([...e.columns]), e.storageField)
  return { ok: true, entries: windowEntries(e.el, rows, displayField, e.storageField) }
}

function magnifierOf(el: HTMLElement): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('.magnifier') ?? null
}

function close(withFocus = true): void {
  const lookupWindow = maskState.lookupWindow
  const target = withFocus ? lookupWindow.backFocus : null
  lookupWindow.backFocus = null
  lookupWindow.open?.remove()
  lookupWindow.open = null
  lookupWindow.openFor = null
  if (typeof target === 'function') target()
  else target?.focus()
}

export function closeLookupFor(el: HTMLElement): void {
  if (maskState.lookupWindow.openFor === el) close(false)
}

type ColumnsSource = Pick<LookupArgs, 'storageField' | 'storageTitle'>

export function automaticColumns(args: ColumnsSource): Column[] {
  const title = args.storageTitle !== '' ? args.storageTitle : 'Wert'
  return [{ key: `${FIELD_KEY_PREFIX}${args.storageField}`, title, field: args.storageField }]
}

function windowTable(tag: string, args: LookupArgs, entries: readonly Entry[]): WindowTable {
  const own = coerceLookupColumns([...args.columns])
  const columns = lookupColumns(windowColumnsOr(own, () => automaticColumns(args)))

  const table = document.createElement(tag) as WindowTable
  if (args.preview === true) table.preview = true
  else table.setAttribute(BLOCK_ID_ATTR, lookupKey(args.el, args.spot))
  table.setAttribute('fills', '')
  table.setAttribute('search', 'true')
  table.setAttribute('columnpicker', 'true')
  table.style.setProperty('--se-r-lg', '0px')
  table.rowsFrom = 'handed'
  table.columns = columns

  const singleColumn = onlyOneColumn(
    displayFieldOf(own, args.storageField),
    args.storageField,
  )
  table.handedRows = entries.map((e) => ({
    rawRow: e.record,
    cells: own.length > 0
      ? own.map((s) => (s.field === '' ? '' : maskState.host.readField(e.record, s.field)))
      : (singleColumn ? [e.value] : [e.display, e.value]),
  }))
  return table
}

function wireDrag(dialog: DialogFrame, args: LookupArgs): void {
  dialog.addEventListener(DIALOG_SIZE_EVENT, (event) => {
    const detail = (event as CustomEvent<DialogSizeDetail>).detail
    if (detail.gesture === 'reset') {
      args.setMetrics?.(detail.axis, undefined)
      return
    }
    if (detail.axis === 'width') dialog.width = detail.value
    else dialog.height = detail.value
    if (detail.gesture === 'end') args.setMetrics?.(detail.axis, detail.value)
  })
}

export function openLookup(args: LookupArgs): void {
  const tag = blockType(WINDOW_TABLE_TYPE)?.tag
  if (tag === undefined) return

  let entries = args.entries

  if (entries === undefined) {
    const result = fetchEntries(args)
    if (!result.ok) return
    entries = result.entries
  }

  const found = entries ?? []

  close(false)

  const table = windowTable(tag, args, found)
  const holder = document.createElement('div')
  holder.style.display = 'contents'
  render(html`<ff-dialog
    viewport
    escape-closes
    data-ff-lookup
    ?movable=${args.preview === true}
    .heading=${args.title !== '' ? args.title : 'Nachschlagen'}
    .width=${args.width}
    .height=${args.height}
    @ff-dialog-close=${() => close()}
    @click=${(e: Event) => e.stopPropagation()}
  >${table}</ff-dialog>`, holder)

  const dialog = holder.querySelector<DialogFrame>(DIALOG_FRAME_TAG)
  if (dialog && args.preview === true) wireDrag(dialog, args)
  table.addEventListener(ROW_ACTIVATED_EVENT, (event) => {
    const detail = (event as CustomEvent<RowActivatedDetail>).detail
    const entry = found[detail.rawIndex]
    if (!entry) return
    close()
    args.onAdopt(entry.display, entry.value, entry.record)
  })

  const lookupWindow = maskState.lookupWindow
  lookupWindow.backFocus = args.backFocus ?? magnifierOf(args.el)
  document.body.appendChild(holder)
  lookupWindow.open = holder
  lookupWindow.openFor = args.el

  const brought = args.searchText ?? ''
  if (brought !== '') table.setSearchText(brought)

  if (dialog) {
    void Promise.all([dialog.updateComplete, table.updateComplete]).then(() => {
      if (dialog.isConnected) table.focusSearch()
    })
  }
}
