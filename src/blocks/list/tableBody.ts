import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { columnsChoiceTpl, type ColumnsChoiceAct, type ColumnsChoicePlacement } from './columnPicker'
import { markHit } from './textSearch'
import { asNumber } from '../../core/data/calculation'
import {
  CELL_PLACEHOLDER,
  type Column,
  type ColumnView,
  type ColumnsGrid,
} from './columns'
import { widthsHandles, type WidthsHost } from './columnWidth'
import { moveRowsFocus, focusFirstRow, focusSearchRow } from './rowActivation'
import { recordText } from './tableModel'
import { magnifierIcon } from '../lookup/lookupControl'

export interface RowDecoration {
  status: string

  className: string

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

export interface Sublines {
  count: number

  render: (placement: {
    view: ColumnView
    cols: ColumnsGrid

    // The columns of the grey line under each row, with their own grid.
    sub: ColumnView
    subCols: ColumnsGrid
    rulerTicks: number | null
  }) => TemplateResult
}

interface BodyPlacement {
  columns: readonly Column[]

  slots: readonly number[]

  cols: ColumnsGrid

  sub: ColumnView
  subCols: ColumnsGrid

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

  empty: boolean

  decoration: (rawIndex: number | null) => RowDecoration

  // A column that must hold a value before a row is captured.
  required: (slot: number) => boolean

  bottom: TemplateResult | typeof nothing
}

interface BodyAct {
  setSearchText: (text: string) => void

  widths: WidthsHost

  subWidths: WidthsHost

  clickHead: (index: number) => void

  openColumnPicker: (e: MouseEvent) => void
  columnPicker: ColumnsChoiceAct

  activateRow: (rawIndex: number | null, viewIndex: number) => void

  rowDouble: (rawIndex: number | null) => void
}

function ruler(placement: BodyPlacement): TemplateResult | typeof nothing {
  if (placement.rulerTicks === 0) return nothing
  const style = placement.rulerTicks === null
    ? placement.cols
    : {
        ...placement.cols,
        flex: '0 1 auto',
        height: `calc(var(--record-height) * ${placement.rulerTicks})`,
      }
  return html`<div class="ruler" role="presentation" style=${styleMap(style)}>
          ${placement.columns.map(() => html`<div></div>`)}
        </div>`
}

function cellTpl(
  placement: BodyPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
  s: Column,
  slot: number,
): TemplateResult {
  const value = rawIndex !== null ? placement.valueAt(rawIndex, slot) : CELL_PLACEHOLDER
  const own = rawIndex === null ? null : decoration.cell(slot, s, value)
  if (own !== null) return own

  const classes = [
    s.hidden === true ? 'hidden' : '',
    rawIndex !== null && asNumber(value) !== null ? 'number' : '',
  ].filter((k) => k !== '').join(' ')
  return html`<div
    class=${classes === '' ? nothing : classes}
    role="cell"
  >${markHit(value, placement.searchText)}</div>`
}

function rowTpl(
  placement: BodyPlacement,
  act: BodyAct,
  rawIndex: number | null,
  viewIndex: number,
): TemplateResult {
  const activatable = rawIndex !== null
  const decoration = placement.decoration(rawIndex)
  const sub = placement.sub
  return html`<div
    class="row${
      rawIndex !== null && placement.showsRows ? ' selectable' : ''}${
      rawIndex !== null && rawIndex === placement.selectionIndex ? ' selected' : ''}${
      sub.columns.length > 0 ? ' subline' : ''}${
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
    ${sub.columns.length === 0 ? nothing : html`<div class="sub" role="presentation" style=${styleMap(placement.subCols)}>
      ${sub.columns.map((s, i) => cellTpl(placement, decoration, rawIndex, s, sub.slots[i]))}
    </div>`}
    ${decoration.right}
  </div>`
}

function headCellTpl(
  placement: BodyPlacement,
  act: BodyAct,
  s: Column,
  slot: number,
  i: number,
): TemplateResult {
  return html`<div
    class=${[s.hidden === true ? 'hidden' : '', s.total === true ? 'number' : '']
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
      <div class="body" role=${placement.empty ? nothing : 'table'} tabindex="-1">
      <div class="head${placement.sub.columns.length > 0 ? ' subline' : ''}" role="row" style=${styleMap(placement.cols)}>
        ${placement.columns.map((s, i) => headCellTpl(placement, act, s, placement.slots[i], i))}
        ${widthsHandles(placement.columns.length, act.widths)}
        ${placement.sub.columns.length === 0 ? nothing : html`<div class="sub" role="presentation" style=${styleMap(placement.subCols)}>
          ${placement.sub.columns.map((s, i) => headCellTpl(placement, act, s, placement.sub.slots[i], i))}
          ${widthsHandles(placement.sub.columns.length, act.subWidths)}
        </div>`}
      </div>
        ${placement.empty ? nothing : html`
        ${placement.rows.map((rawIndex, viewIndex) => html`${
          viewIndex === firstEmpty ? placement.bottom : nothing
        }${rowTpl(placement, act, rawIndex, viewIndex)}`)}
        ${firstEmpty === -1 ? placement.bottom : nothing}
        ${ruler(placement)}`}
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
  if (!saysSomething) return html`<div class="foot foot--quiet"></div>`
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
      ${!placement.paging ? nothing : html`<div class="page-nav">
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
