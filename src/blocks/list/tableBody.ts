import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { columnsChoiceTpl, type ColumnsChoiceAct, type ColumnsChoicePlacement } from './columnPicker'
import { markHit } from './textSearch'
import {
  columnStandsRight,
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

// The columns of the row, and under each the columns of its grey second
// line: a subline column stands in the cell of the column it is anchored to.
export interface RowLayout {
  main: ColumnView

  hasSubs: boolean

  subsOf: (mainSlot: number) => ColumnView
}

export const WITHOUT_SUBS: ColumnView = { columns: [], slots: [] }

export interface Sublines {
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

// The second line of a cell: the values of the subline columns anchored to
// it, side by side, each one a part.
export function sublineTpl(
  parts: readonly { content: TemplateResult | string; typable: boolean }[],
): TemplateResult {
  return html`<span class="subs">${parts.map((p) => html`<span
    class=${p.typable ? 'part typable' : p.content === '' ? 'part empty' : 'part'}
  >${p.content}</span>`)}</span>`
}

function cellTpl(
  placement: BodyPlacement,
  decoration: RowDecoration,
  rawIndex: number | null,
  s: Column,
  slot: number,
): TemplateResult {
  const main = partOf(placement, decoration, rawIndex, s, slot)
  const subs = placement.layout.subsOf(slot)
  const classes = [
    s.hidden === true ? 'hidden' : '',
    columnStandsRight(s) ? 'right' : '',
    main.typable ? 'typable' : '',
  ].filter((k) => k !== '').join(' ')
  if (!placement.layout.hasSubs) {
    return html`<div class=${classes === '' ? nothing : classes} role="cell">${main.content}</div>`
  }
  return html`<div class=${classes === '' ? nothing : classes} role="cell"
    ><span class="line">${main.content}</span>${subs.columns.length === 0
      ? nothing
      : sublineTpl(subs.columns.map((c, i) => partOf(placement, decoration, rawIndex, c, subs.slots[i])))
    }</div>`
}

function rowTpl(
  placement: BodyPlacement,
  act: BodyAct,
  rawIndex: number | null,
  viewIndex: number,
): TemplateResult {
  const activatable = rawIndex !== null
  const decoration = placement.decoration(rawIndex)
  return html`<div
    class="row${
      rawIndex !== null && placement.showsRows ? ' selectable' : ''}${
      rawIndex !== null && rawIndex === placement.selectionIndex ? ' selected' : ''}${
      rawIndex !== null && placement.layout.hasSubs ? ' subline' : ''}${
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
    ${decoration.right}
  </div>`
}

function headTitleTpl(placement: BodyPlacement, s: Column, slot: number): TemplateResult {
  return html`<span class="head-text">${s.title}</span>${placement.required(slot)
    ? html`<em class="required">*</em>`
    : nothing}${!placement.editable && placement.sortColumn === slot
    ? html`<span class="sort-arrow">${placement.sortAscending ? ' ▲' : ' ▼'}</span>`
    : ''}`
}

// A head cell: the title of the column and, small under it, the titles of
// the subline columns anchored to it, each one a head of its own.
function headCellTpl(
  placement: BodyPlacement,
  act: BodyAct,
  s: Column,
  slot: number,
  i: number,
): TemplateResult {
  const subs = placement.layout.subsOf(slot)
  // With sublines the editor's spot is the title line alone, not the whole
  // two-line cell: the subline titles below have spots of their own.
  const onLine = placement.layout.hasSubs
  return html`<div
    class=${[s.hidden === true ? 'hidden' : '', columnStandsRight(s) ? 'right' : '']
      .filter((k) => k !== '').join(' ') || nothing}
    role="columnheader"
    data-ff-editable=${onLine ? nothing : ''}
    data-ff-entry=${placement.preview && !onLine ? slot : nothing}
    style="grid-row: 1; grid-column: ${i + 1}"
    @click=${() => act.clickHead(slot)}
    @contextmenu=${placement.columnPickerOn
      ? (e: MouseEvent) => act.openColumnPicker(e)
      : nothing}
  ><span
    class="head-line"
    data-ff-editable=${onLine ? '' : nothing}
    data-ff-entry=${placement.preview && onLine ? slot : nothing}
  >${headTitleTpl(placement, s, slot)}</span>${subs.columns.length === 0
    ? nothing
    : html`<span class="head-sub">${subs.columns.map((c, k) => html`<span
        class="head-sub-text"
        data-ff-editable
        data-ff-entry=${placement.preview ? subs.slots[k] : nothing}
        @click=${(e: MouseEvent) => {
          e.stopPropagation()
          act.clickHead(subs.slots[k])
        }}
      >${c.title}${placement.required(subs.slots[k]) ? html`<em class="required">*</em>` : nothing}</span>`)}</span>`
  }</div>`
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
      <div class="head${placement.layout.hasSubs ? ' subline' : ''}" role="row" style=${styleMap(placement.cols)}>
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
