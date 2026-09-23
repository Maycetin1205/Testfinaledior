import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { columnsChoiceTpl, type ColumnsChoiceAct, type ColumnsChoicePlacement } from './columnPicker'
import { markHit } from './textSearch'
import { asNumber } from './sorting'
import {
  CELL_PLACEHOLDER,
  type Column,
  type ColumnView,
  type ColumnsRaster,
} from './columns'
import { widthsHandles, type WidthsHost } from './columnWidth'
import { moveRowsFocus, focusFirstRow, focusSearchRow } from './rowActivation'
import { recordText } from './tableModel'

export interface RowDecoration {
  status: string

  klasse: string

  cell: (slot: number, column: Column, value: string) => TemplateResult | null

  right: TemplateResult | typeof nothing

  key: (e: KeyboardEvent) => boolean
}

export const WITHOUT_DECORATION: RowDecoration = {
  status: '',
  klasse: '',
  cell: () => null,
  right: nothing,
  key: () => false,
}

export interface Sublines {
  count: number

  render: (placement: {
    view: ColumnView
    cols: ColumnsRaster
    rulerTicks: number | null
  }) => TemplateResult
}

export interface BodyPlacement {
  columns: readonly Column[]

  slots: readonly number[]

  cols: ColumnsRaster

  editable: boolean

  inEditor: boolean

  showHead: boolean

  columnPickerOn: boolean

  columnPicker: ColumnsChoicePlacement | null

  selectionSemantics: boolean
  showSearch: boolean
  searchText: string

  sortColumn: number
  sortOn: boolean

  rows: readonly (number | null)[]

  valueAt: (rawIndex: number, slot: number) => string

  rulerTicks: number | null

  showsRows: boolean
  selectionIndex: number

  empty: boolean

  decoration: (rawIndex: number | null) => RowDecoration

  bottom: TemplateResult | typeof nothing
}

export interface BodyAct {
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
        height: `calc(var(--row-height) * ${placement.rulerTicks})`,
      }
  return html`<div class="ruler" role="presentation" style=${styleMap(style)}>
          ${placement.columns.map(() => html`<div></div>`)}
        </div>`
}

function rowTpl(
  placement: BodyPlacement,
  tun: BodyAct,
  rawIndex: number | null,
  viewIndex: number,
): TemplateResult {
  const activatable = rawIndex !== null && !placement.inEditor
  const decoration = placement.decoration(rawIndex)
  return html`<div
    class="row${viewIndex % 2 === 1 ? ' zebra' : ''}${
      rawIndex !== null && placement.showsRows ? ' selectable' : ''}${
      rawIndex !== null && rawIndex === placement.selectionIndex ? ' selected' : ''}${
      decoration.klasse === '' ? '' : ' ' + decoration.klasse}"
    role="row"
    data-status=${decoration.status === '' ? nothing : decoration.status}
    data-ff-raw=${rawIndex ?? nothing}
    tabindex=${activatable ? '0' : nothing}
    aria-selected=${placement.selectionSemantics && rawIndex !== null
      ? String(rawIndex === placement.selectionIndex)
      : nothing}
    style=${styleMap(placement.cols)}
    @click=${() => {
      tun.activateRow(rawIndex, viewIndex)
    }}
    @dblclick=${(e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.cell-input')) return
      tun.rowDouble(rawIndex)
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
      tun.activateRow(rawIndex, viewIndex)
    }}
  >
    ${placement.columns.map((s, i) => {
      const slot = placement.slots[i]
      const value = rawIndex !== null ? placement.valueAt(rawIndex, slot) : CELL_PLACEHOLDER
      const own = rawIndex === null ? null : decoration.cell(slot, s, value)
      if (own !== null) return own

      const headHandle = placement.inEditor && !placement.showHead && placement.editable
      const classes = [
        s.hidden === true ? 'hidden' : '',
        rawIndex !== null && asNumber(value) !== null ? 'number' : '',
      ].filter((k) => k !== '').join(' ')
      return html`<div
        class=${classes === '' ? nothing : classes}
        role="cell"
        data-ff-editable=${headHandle ? '' : nothing}
        data-ff-entry=${headHandle && viewIndex === 0 ? slot : nothing}
      >${markHit(value, placement.searchText)}</div>`
    })}
    ${decoration.right}
  </div>`
}

export function tableBody(placement: BodyPlacement, tun: BodyAct): TemplateResult {
  const firstEmpty = placement.rows.indexOf(null)
  return html`
      ${placement.showSearch ? html`<div class="search-row">
        <input
          type="search"
          placeholder="Tabelle durchsuchen…"
          aria-label="Tabelle durchsuchen"
          .value=${placement.searchText}
          @input=${(e: Event) => tun.setSearchText((e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key !== 'ArrowDown') return
            if (focusFirstRow(e.target)) e.preventDefault()
          }}
        />
      </div>` : ''}
      <div class="body" role=${placement.empty ? nothing : 'table'} tabindex="-1">
      ${placement.showHead ? html`<div class="head" role="row" style=${styleMap(placement.cols)}>
        ${
          placement.columns.map(
          (s, i) => html`<div
            class=${[s.hidden === true ? 'hidden' : '', s.total === true ? 'number' : '']
              .filter((k) => k !== '').join(' ') || nothing}
            role="columnheader"
            data-ff-editable
            data-ff-entry=${placement.inEditor ? placement.slots[i] : nothing}
            style="grid-row: 1; grid-column: ${i + 1}"
            @click=${() => tun.clickHead(placement.slots[i])}
            @contextmenu=${placement.columnPickerOn
              ? (e: MouseEvent) => tun.openColumnPicker(e)
              : nothing}
          ><span class="head-text">${s.title}</span>${!placement.editable && placement.sortColumn === placement.slots[i]
            ? html`<span class="sort-arrow">${placement.sortOn ? ' ▲' : ' ▼'}</span>`
            : ''}</div>`,
        )}
        ${widthsHandles(placement.columns.length, tun.widths)}
      </div>` : nothing}
        ${placement.empty ? nothing : html`
        ${placement.rows.map((rawIndex, viewIndex) => html`${
          viewIndex === firstEmpty ? placement.bottom : nothing
        }${rowTpl(placement, tun, rawIndex, viewIndex)}`)}
        ${firstEmpty === -1 ? placement.bottom : nothing}
        ${ruler(placement)}`}
      </div>
      ${columnsChoiceTpl(placement.columnPicker, tun.columnPicker)}
    `
}

export interface FootPlacement {
  showsRows: boolean

  visible: number
  total: number
  searchesActive: boolean
  selectionActive: boolean
  page: number
  pageCount: number

  totals: readonly { title: string; text: string }[]

  paging: boolean

  empty: boolean
}

export interface FootAct {
  page: (to: number) => void
}

export function tableFoot(
  placement: FootPlacement,
  tun: FootAct,
): TemplateResult | typeof nothing {
  if (placement.empty) return nothing

  const saysSomething = placement.pageCount > 1 || placement.searchesActive || placement.selectionActive || placement.totals.length > 0
  if (!saysSomething) return html`<div class="foot foot--quiet"></div>`
  return html`<div class="foot">
    <div class="page-info">${recordText({
      showsRows: placement.showsRows,
      visible: placement.visible,
      total: placement.total,
      searchesActive: placement.searchesActive,
      selectionActive: placement.selectionActive,
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
          @click=${() => tun.page(placement.page - 1)}
        >‹</button>
        <span>Seite ${placement.page + 1} von ${placement.pageCount}</span>
        <button
          aria-label="Seite vor"
          ?disabled=${placement.page >= placement.pageCount - 1}
          @click=${() => tun.page(placement.page + 1)}
        >›</button>
      </div>`}
    </div>
  </div>`
}
