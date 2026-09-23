import {
  html,
  nothing,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { ViewChoices } from './viewChoices'
import { giverIdOf } from '../behavior/selection'
import type { MeasureTarget } from './pageSize'
import { columnsView, sendColumnsChange, type Column } from './columns'
import { WidthsState } from './columnWidth'
import { ColumnsChoiceState } from './columnPicker'
import { tableRenderModel } from './tableModel'
import type { ListSettings } from './listDeclaration'
import {
  WITHOUT_DECORATION,
  tableFoot,
  tableBody,
  type Sublines,
  type RowDecoration,
} from './tableBody'
import {
  activateRow,
  actionKeyAtRow,
  RowsChoice,
  rowDouble,
} from './rowActivation'
import {
  followSource,
  unfollowSource,
  cellsForHandedRows,
  WITHOUT_ROWS,
  type HandedRow,
  type RowsFrom,
  type RowsElement,
} from './sourceRows'

// The element a record list drives: it holds the rows, carries the settings the
// list declares and reads its own columns and calculations.
export interface ListElement
  extends RowsElement, ListSettings, MeasureTarget, ReactiveControllerHost {
  // Only compared: new columns void the widths dragged for the old ones.
  readonly columns: readonly Column[]
  inEditor: boolean
  editable: boolean
  hasUpdated: boolean
}

// What a block adds on top of a plain list. The capture fills all three, the
// table none.
export interface ListHooks {
  cellValue: (rawIndex: number, slot: number) => string

  decoration: () => (rawIndex: number | null) => RowDecoration

  bottom: () => Sublines | null
}

interface ListShowQuestion {
  inEditor: boolean

  rowsFrom: RowsFrom

  sourceId: string

  columns: readonly Column[]

  rowCount: number
}

interface ListShows {
  // False in the editor: there the list draws placeholder rows, not data.
  rows: boolean

  empty: boolean
}

// Rows of blanks are as empty as no rows at all.
function listEmptyState(question: ListShowQuestion): ListShows {
  const sourceId = question.sourceId.trim()
  const rows = !question.inEditor && (question.rowsFrom === 'handed' || sourceId !== '')
  if (!rows) return { rows: false, empty: false }

  const anyColumnBound = question.columns.some((column) => column.field.trim() !== '')
  const empty = question.rowCount === 0
    || (question.rowsFrom === 'source' && !anyColumnBound)
  return { rows: true, empty }
}

export class RecordList implements ReactiveController {
  private readonly el: ListElement

  private readonly hooks: ListHooks | null

  private _rowsFrom: RowsFrom = 'source'

  private readonly _widths: WidthsState

  private readonly _view: ViewChoices

  private readonly _choice: ColumnsChoiceState

  private readonly _rowsChoice: RowsChoice

  private _columns: readonly Column[] | null = null

  constructor(el: ListElement, hooks: ListHooks | null = null) {
    this.el = el
    this.hooks = hooks
    this._widths = new WidthsState({
      inEditor: () => el.inEditor,
      fullSlot: (rendered) =>
        columnsView(el.listColumns(), el.inEditor, this._choice.away()).slots[rendered] ?? rendered,
      columnsList: () => [...el.listColumns()],
      writeColumns: (columns) => sendColumnsChange(el, columns),
      report: () => el.requestUpdate(),
    })
    this._view = new ViewChoices(el, () => el.listColumns())
    this._choice = new ColumnsChoiceState({
      block: el,
      on: () => this.columnPickerOn,
      report: () => el.requestUpdate(),
      forgetWidths: () => this._widths.forget(),
    })
    this._rowsChoice = new RowsChoice(el)
    el.addController(this)
  }

  get rowsFrom(): RowsFrom {
    return this._rowsFrom
  }

  set rowsFrom(value: RowsFrom) {
    if (value === this._rowsFrom) return
    this._rowsFrom = value
    this.reset()
    if (this.el.isConnected) {
      if (value === 'handed') unfollowSource(this.el)
      else followSource(this.el)
    }
    this.el.requestUpdate()
  }

  set handedRows(rows: readonly HandedRow[]) {
    const el = this.el
    const cells = cellsForHandedRows(rows, el.listColumns(), el.listCalculations())
    el.rawRows = cells.rawRows
    el.dataRows = cells.dataRows
    el.rowsReport = WITHOUT_ROWS
    this._rowsChoice.forget()
    this._view.invalidate()
    el.requestUpdate()
  }

  reset(): void {
    const el = this.el
    el.rawRows = []
    el.dataRows = []
    el.rowsReport = WITHOUT_ROWS
    this._rowsChoice.forget()
    this._view.reset()
  }

  focusSearch(): boolean {
    return this._view.focusSearch()
  }

  setSearchText(text: string): void {
    this._view.setSearchText(text)
    this.el.requestUpdate()
  }

  private get columnPickerOn(): boolean {
    return this.el.columnPicker && this.el.headerRow && !this.el.inEditor
  }

  private cellValue(rawIndex: number, slot: number): string {
    if (this.hooks) return this.hooks.cellValue(rawIndex, slot)
    return this.el.dataRows[rawIndex]?.[slot] ?? ''
  }

  private readonly actionKey = (e: KeyboardEvent): void => {
    actionKeyAtRow(this.el, this._rowsChoice, e)
  }

  private readonly locksReload = (e: KeyboardEvent): void => {
    if (!this.el.inEditor && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  hostConnected(): void {
    const el = this.el
    el.addEventListener('keydown', this.actionKey)
    el.addEventListener('keydown', this.locksReload)
    if (this._rowsFrom === 'source') followSource(el)
    this._view.observe()
  }

  hostUpdate(): void {
    if (this.el.columns === this._columns) return
    this._columns = this.el.columns
    this._widths.forget()
  }

  hostUpdated(): void {
    if (!this.el.hasUpdated) this._view.observe()
    this._view.afterRender()
  }

  hostDisconnected(): void {
    const el = this.el
    el.removeEventListener('keydown', this.actionKey)
    el.removeEventListener('keydown', this.locksReload)
    this._choice.detach()
    this._view.detach()
    unfollowSource(el)
  }

  private openColumnPicker(e: MouseEvent): void {
    const frame = this.el.shadowRoot?.querySelector('.table')?.getBoundingClientRect()
    if (!frame) return
    this._choice.openAt(e, frame)
  }

  render(): TemplateResult {
    const el = this.el
    const columns = el.listColumns()
    const visible = columnsView(columns, el.inEditor, this._choice.away())
    const bottom = this.hooks?.bottom() ?? null
    const decoration = this.hooks?.decoration() ?? ((): RowDecoration => WITHOUT_DECORATION)
    const shows = listEmptyState({
      inEditor: el.inEditor,
      rowsFrom: this._rowsFrom,
      sourceId: el.source,
      columns,
      rowCount: el.dataRows.length,
    })

    const view = tableRenderModel({
      columns,
      rendered: visible.columns,
      slots: visible.slots,
      widthOf: (i) => this._widths.widthOf(i),
      showsRows: shows.rows,
      empty: shows.empty,
      dataRows: el.dataRows,
      searchText: this._view.searchText,
      sortColumn: this._view.sortColumn,
      sortAscending: this._view.sortAscending,
      wantedPage: this._view.page,
      measured: this._view.metrics,
      takenRows: bottom?.count ?? 0,
      valueAt: (row, column) => this.cellValue(row, column),
      paging: el.paging,
    })
    return html`<div class="table" style=${styleMap({
      '--tick': `${view.tick}px`,
      '--row-height': `${view.rowsHeight}px`,
    })}>
      ${tableBody({
        columns: visible.columns,
        slots: visible.slots,
        cols: view.cols,
        editable: el.editable,
        inEditor: el.inEditor,
        showHead: el.headerRow,
        columnPickerOn: this.columnPickerOn,
        columnPicker: this._choice.open === null ? null : {
          selectable: columns.filter((column) => column.hidden !== true),
          away: this._choice.away(),
          left: this._choice.open.left,
          top: this._choice.open.top,
        },
        selectionSemantics: giverIdOf(el) !== '',
        showSearch: el.search,
        searchText: this._view.searchText,
        sortColumn: this._view.sortColumn,
        sortAscending: this._view.sortAscending,
        rows: view.rows,
        valueAt: (row, column) => this.cellValue(row, column),
        rulerTicks: view.rulerTicks,
        showsRows: view.showsRows,
        selectionIndex: this._rowsChoice.slotIn(el.rawRows),
        empty: view.empty,
        decoration,
        bottom: bottom === null
          ? nothing
          : bottom.render({ view: visible, cols: view.cols, rulerTicks: view.rulerTicks }),
      }, {
        setSearchText: (text) => this._view.setSearchText(text),
        openColumnPicker: (e) => this.openColumnPicker(e),
        columnPicker: {
          toggle: (key) => this._choice.toggle(key),
          showAll: () => this._choice.showAll(),
          close: () => this._choice.close(),
        },
        widths: this._widths.hostForDrag(),
        clickHead: (i) => {
          if (!el.editable) this._view.clickSort(i)
        },
        activateRow: (rawIndex, viewIndex) => {
          activateRow(el, this._rowsChoice, el.rawRows, rawIndex, viewIndex)
          el.requestUpdate()
        },
        rowDouble: (rawIndex) => rowDouble(el, el.rawRows, rawIndex),
      })}
      ${tableFoot({
        showsRows: view.showsRows,
        visible: view.total,
        total: el.dataRows.length,
        searchesActive: this._view.searchesActive,
        selectionActive: el.rowsReport.bySelection,
        page: view.page,
        pageCount: view.pageCount,
        paging: el.paging,
        totals: view.totals,
        empty: view.empty,
      }, {
        page: (to) => this._view.goToPage(to),
      })}
    </div>`
  }
}
