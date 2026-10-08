import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { columnsChoiceTpl, type ColumnsChoiceAct, type ColumnsChoicePlacement } from './columnPicker'
import { markHit } from '../parts/cellSearch'
import {
  columnStandsRight,
  type Column,
  type ColumnView,
  type ColumnsGrid,
} from '../parts/column'
import { greyCellTpl, type GreyPart, type RowLayout } from '../parts/cell'
import { widthsHandles, type WidthsHost } from './columnWidth'
import { moveRowsFocus, focusFirstRow, focusSearchRow } from './rowActivation'
import { recordText } from './tableModel'
import { magnifierIcon } from '../lookup/lookupControl'

export interface RowDecoration {
  status: string

  className: string

  // What a cell shows in place of its text, like the input of a typable cell.
  cell: (slot: number, column: Column, value: string) => TemplateResult | null

  right: TemplateResult | typeof nothing

  key: (e: KeyboardEvent) => boolean
}

export const WITHOUT_DECORATION: RowDecoration = {
  status: '',
  className: '',
  cell: () => null,
  right: nothing,
  key: () => false,
}

// The rows below the records: what a block draws after them, like the rows
// of a capture.
export interface RowsBelow {
  count: number

  render: (placement: {
    view: ColumnView
    cols: ColumnsGrid
    layout: RowLayout
    rulerTicks: number | null
  }) => TemplateResult
}

interface BodyPlacement {
  columns: readonly Column[]

  slots: readonly number[]

  cols: ColumnsGrid

  layout: RowLayout

  editable: boolean

  preview: boolean

  columnPickerOn: boolean

  columnPicker: ColumnsChoicePlacement | null

  selectionSemantics: boolean
  showSearch: boolean
  searchText: string

  sortColumn: number
  sortAscending: boolean

  rows: readonly (number | null)[]

  valueAt: (rawIndex: number, slot: number) => string

  rulerTicks: number | null

  showsRows: boolean
  selectionIndex: number

  decoration: (rawIndex: number | null) => RowDecoration

  // A column that must hold a value before a row is captured.
  required: (slot: number) => boolean

  bottom: TemplateResult | typeof nothing
}

interface BodyAct {
  setSearchText: (text: string) => void

  widths: WidthsHost

  clickHead: (index: number) => void

  openColumnPicker: (e: MouseEvent) => void
  columnPicker: ColumnsChoiceAct

  activateRow: (rawIndex: number | null, viewIndex: number) => void

  rowDouble: (rawIndex: number | null) => void
}

// The lines under the records. It also takes the room a record without a
// grey line leaves, so the lines reach the foot.
function ruler(placement: BodyPlacement): TemplateResult {
  const style = placement.rulerTicks === null
    ? placement.cols
    : {
        ...placement.cols,
        height: `calc(var(--record-height) * ${placement.rulerTicks})`,
      }
  return html`<div class="ruler" role="presentation" style=${styleMap(style)}>
          ${placement.columns.map(() => html`<div></div>`)}
        </div>`
}

interface CellPart {
  value: string

  content: TemplateResult | string

  typable: boolean
}

function partOf(
  placement: BodyPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
  column: Column,
  slot: number,
): CellPart {
  const value = rawIndex !== null ? placement.valueAt(rawIndex, slot) : ''
  const own = rawIndex === null ? null : decoration.cell(slot, column, value)
  return {
    value,
    content: own ?? markHit(value, placement.searchText),
    typable: own !== null,
  }
}

function cellTpl(
  placement: BodyPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
  s: Column,
  slot: number,
): TemplateResult {
  const main = partOf(placement, decoration, rawIndex, s, slot)
  const classes = [
    s.hidden === true ? 'hidden' : '',
    columnStandsRight(s) ? 'right' : '',
    main.typable ? 'typable' : '',
  ].filter((k) => k !== '').join(' ')
  return html`<div class=${classes === '' ? nothing : classes} role="cell">${main.content}</div>`
}

// The grey line of a record, one part under each cell of the row: shown
// where a value stands or a cell takes typing. Null when nothing shows, and
// the record stays one line high.
function greyParts(
  placement: BodyPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
): (GreyPart | null)[] | null {
  if (rawIndex === null || placement.layout.under.size === 0) return null
  const parts = placement.slots.map((slot): GreyPart | null => {
    const sub = placement.layout.under.get(slot)
    if (sub === undefined) return null
    const part = partOf(placement, decoration, rawIndex, sub.column, sub.slot)
    return part.typable || part.value !== ''
      ? { column: sub.column, content: part.content, typable: part.typable }
      : null
  })
  return parts.some((part) => part !== null) ? parts : null
}

function rowTpl(
  placement: BodyPlacement,
  act: BodyAct,
  rawIndex: number | null,
  viewIndex: number,
): TemplateResult {
  const activatable = rawIndex !== null
  const decoration = placement.decoration(rawIndex)
  const grey = greyParts(placement, decoration, rawIndex)
  return html`<div
    class="row${
      rawIndex !== null && placement.showsRows ? ' selectable' : ''}${
      rawIndex !== null && rawIndex === placement.selectionIndex ? ' selected' : ''}${
      grey !== null ? ' subline' : ''}${
      decoration.className === '' ? '' : ' ' + decoration.className}"
    role="row"
    data-status=${decoration.status === '' ? nothing : decoration.status}
    data-ff-raw=${rawIndex ?? nothing}
    tabindex=${activatable ? '0' : nothing}
    aria-selected=${placement.selectionSemantics && rawIndex !== null
      ? String(rawIndex === placement.selectionIndex)
      : nothing}
    style=${styleMap(placement.cols)}
    @click=${(e: MouseEvent) => {
      // The second click of a double-click, or a click into a cell, goes on
      // with the chosen row and leaves it chosen.
      const chosen = rawIndex !== null && rawIndex === placement.selectionIndex
      if (chosen && (e.detail > 1 || (e.target as HTMLElement).closest('.cell-input'))) return
      act.activateRow(rawIndex, viewIndex)
    }}
    @dblclick=${(e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.cell-input')) return
      act.rowDouble(rawIndex)
    }}
    @keydown=${(e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('.cell-input, button')) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const up = e.key === 'ArrowUp'
        const moved = moveRowsFocus(e.target, up ? -1 : 1)
        if (moved || (up && focusSearchRow(e.target))) e.preventDefault()
        return
      }
      if (decoration.key(e)) {
        e.preventDefault()
        return
      }
      if (e.key !== 'Enter') return
      e.preventDefault()
      act.activateRow(rawIndex, viewIndex)
    }}
  >
    ${placement.columns.map((s, i) => cellTpl(placement, decoration, rawIndex, s, placement.slots[i]))}
    ${grey === null ? nothing : grey.map((part, i) => greyCellTpl(i, part))}
    ${decoration.right}
  </div>`
}

// A head cell: the title of the column. The columns of the grey line have no
// head here; their name stands in front of their value.
function headCellTpl(
  placement: BodyPlacement,
  act: BodyAct,
  s: Column,
  slot: number,
  i: number,
): TemplateResult {
  return html`<div
    class=${[s.hidden === true ? 'hidden' : '', columnStandsRight(s) ? 'right' : '']
      .filter((k) => k !== '').join(' ') || nothing}
    role="columnheader"
    data-ff-editable
    data-ff-entry=${placement.preview ? slot : nothing}
    style="grid-row: 1; grid-column: ${i + 1}"
    @click=${() => act.clickHead(slot)}
    @contextmenu=${placement.columnPickerOn
      ? (e: MouseEvent) => act.openColumnPicker(e)
      : nothing}
  ><span class="head-text">${s.title}</span>${placement.required(slot)
    ? html`<em class="required">*</em>`
    : nothing}${!placement.editable && placement.sortColumn === slot
    ? html`<span class="sort-arrow">${placement.sortAscending ? ' ▲' : ' ▼'}</span>`
    : ''}</div>`
}

export function tableBody(placement: BodyPlacement, act: BodyAct): TemplateResult {
  const firstEmpty = placement.rows.indexOf(null)
  return html`
      ${placement.showSearch ? html`<div class="search-row">
        <div class="search">
          <span class="search-icon">${magnifierIcon()}</span>
          <input
            type="search"
            aria-label="Tabelle durchsuchen"
            .value=${placement.searchText}
            @input=${(e: Event) => act.setSearchText((e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key !== 'ArrowDown') return
              if (focusFirstRow(e.target)) e.preventDefault()
            }}
          />
        </div>
      </div>` : ''}
      <div class="body" role="table" tabindex="-1">
      <div class="head" role="row" style=${styleMap(placement.cols)}>
        ${placement.columns.map((s, i) => headCellTpl(placement, act, s, placement.slots[i], i))}
        ${widthsHandles(placement.columns.length, act.widths)}
      </div>
        ${placement.rows.map((rawIndex, viewIndex) => html`${
          viewIndex === firstEmpty ? placement.bottom : nothing
        }${rowTpl(placement, act, rawIndex, viewIndex)}`)}
        ${firstEmpty === -1 ? placement.bottom : nothing}
        ${ruler(placement)}
      </div>
      ${columnsChoiceTpl(placement.columnPicker, act.columnPicker)}
    `
}

interface FootPlacement {
  showsRows: boolean

  visible: number
  total: number
  searchesActive: boolean
  page: number
  pageCount: number

  totals: readonly { title: string; text: string }[]

  paging: boolean

  empty: boolean
}

interface FootAct {
  page: (to: number) => void
}

export function tableFoot(
  placement: FootPlacement,
  act: FootAct,
): TemplateResult | typeof nothing {
  if (placement.empty) return nothing

  const saysSomething = placement.pageCount > 1 || placement.searchesActive || placement.totals.length > 0
  if (!saysSomething) return nothing
  return html`<div class="foot">
    <div class="page-info">${recordText({
      showsRows: placement.showsRows,
      visible: placement.visible,
      total: placement.total,
      searchesActive: placement.searchesActive,
    })}</div>
    ${placement.totals.length === 0 ? nothing : html`<div class="totals">
      ${placement.totals.map((s) => html`<span class="total">
        <span class="total-title">${s.title}</span>
        <b>${s.text}</b>
      </span>`)}
    </div>`}
    <div class="foot-right">
      ${!placement.paging || placement.pageCount <= 1 ? nothing : html`<div class="page-nav">
        <button
          aria-label="Seite zurück"
          ?disabled=${placement.page <= 0}
          @click=${() => act.page(placement.page - 1)}
        >‹</button>
        <span>Seite ${placement.page + 1} von ${placement.pageCount}</span>
        <button
          aria-label="Seite vor"
          ?disabled=${placement.page >= placement.pageCount - 1}
          @click=${() => act.page(placement.page + 1)}
        >›</button>
      </div>`}
    </div>
  </div>`
}
