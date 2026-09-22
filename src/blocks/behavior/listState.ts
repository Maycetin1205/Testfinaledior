import { html, nothing, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { chainsRead } from '../../core/data/actions'
import type { Calculation } from '../../core/data/calculation'
import { booleanProperty, sourceProperty } from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import type { ListBinding } from '../../core/block/listBinding'
import { ViewState } from './viewState'
import { giverIdOf, setSelection } from './selection'
import { reportChainsError, runEvent } from './events'
import { emptyTextProperty } from './emptyState'
import { dayFieldProperty } from './source'
import { ROWS_HEIGHT, type MessTarget } from './pageSize'
import { columnsProperty, columnsView, type Column } from './columns'
import { WidthsState } from './columnWidth'
import { ColumnsChoiceState } from './columnPicker'
import { tableRenderModel, showsRealData } from './tableView'
import {
  WITHOUT_DECORATION,
  tableFoot,
  tableBody,
  type Sublines,
  type RowDecoration,
} from './tableBody'
import {
  activateRow,
  focusedRawIndex,
  KEY_F4,
  ROW_DOUBLE,
  ROW_CHOSEN,
  RowsChoice,
  rowDouble,
} from './rowActivation'
import {
  connectTable,
  disconnectTable,
  deriveRowsOff,
  rowsIndexOf,
  rowsTraitOf,
  type ProvidedRow,
  type DataOwnership,
  type RuntimeTableElement,
} from './rowLink'

export const LIST_GRID = { startWidth: 48, startHeight: 14, minWidth: 12, minHeight: 4 }

// The properties every list carries. The order is the order in the export.
export function listProperties() {
  return {
    source: sourceProperty({
      default: '',
      label: 'Datenquelle',
      help: 'Die Quelle, deren Zeilen die Liste zeigt.',
      place: 'none',
      attribute: 'source',
    }),
    columns: columnsProperty(),
    search: booleanProperty({
      default: true,
      label: 'Suchzeile',
      help: 'Zeigt über der Tabelle ein Feld, mit dem der Bediener den Inhalt durchsucht.',
      attribute: 'search',
      needsSource: true,
    }),
    paging: booleanProperty({
      default: true,
      label: 'Blättern',
      help: 'Ja: Seiten mit Blätter-Knöpfen. Nein: alles untereinander, der Rumpf rollt.',
      attribute: 'paging',
    }),
    headerRow: booleanProperty({
      default: true,
      label: 'Kopfzeile',
      help: 'Aus: keine Titelzeile, kein Sortieren per Titelklick.',
      attribute: 'headerrow',
    }),
    columnPicker: booleanProperty({
      default: false,
      label: 'Spaltenwahl',
      help: 'In der Maske: Rechtsklick auf eine Spaltenüberschrift nimmt Spalten weg '
        + 'und holt sie zurück. Braucht die Kopfzeile.',
      attribute: 'columnpicker',
    }),
    dayField: dayFieldProperty(),
    emptyText: emptyTextProperty(),
  }
}

export function listCapabilities(binding: ListBinding): Capability[] {
  return [
    { kind: 'source' },
    { kind: 'recordPick' },
    { kind: 'followsSelection' },
    { kind: 'list', binding },
    {
      kind: 'events',
      list: [
        { key: ROW_CHOSEN, name: 'Zeile gewählt' },
        { key: ROW_DOUBLE, name: 'Zeile doppelt geklickt' },
        { key: KEY_F4, name: 'F4 – Aktion an der Zeile' },
      ],
    },
  ]
}

export interface ListBlock extends RuntimeTableElement, MessTarget {
  inEditor: boolean
  editable: boolean
}

export interface ListHost {
  block: ListBlock

  report: () => void

  columns: () => Column[]

  calculations: () => readonly Calculation[]

  writeColumns: (columns: Column[]) => void

  source: () => string
  search: () => boolean
  paging: () => boolean
  headerRow: () => boolean
  columnPicker: () => boolean
  emptyText: () => string

  cellValue?: (rawIndex: number, slot: number) => string
  decoration?: () => (rawIndex: number | null) => RowDecoration
  bottom?: () => Sublines | null
}

export class ListState {
  private readonly host: ListHost

  private _ownership: DataOwnership = 'softengine'

  private readonly _widths: WidthsState

  private readonly _view: ViewState

  private readonly _choice: ColumnsChoiceState

  private readonly _rowsChoice: RowsChoice

  constructor(host: ListHost) {
    this.host = host
    this._widths = new WidthsState({
      inEditor: () => host.block.inEditor,
      fullSlot: (rendered) =>
        columnsView(host.columns(), host.block.inEditor, this._choice.away())
          .slots[rendered] ?? rendered,
      columnsList: () => host.columns(),
      writeColumns: (columns) => host.writeColumns(columns),
      report: () => host.report(),
    })
    this._view = new ViewState({
      block: host.block,
      editable: () => host.block.editable,
      rowsHeight: () => ROWS_HEIGHT,
      report: () => host.report(),
      columns: () => host.columns(),
      remembersSorting: () => !host.block.inEditor,
    })
    this._choice = new ColumnsChoiceState({
      block: host.block,
      on: () => this.columnPickerOn,
      report: () => host.report(),
      widthsForget: () => this._widths.forget(),
    })
    this._rowsChoice = new RowsChoice(host.block)
  }

  get ownership(): DataOwnership {
    return this._ownership
  }

  set ownership(next: DataOwnership) {
    if (next === this._ownership) return
    this._ownership = next
    this.reset()
    if (this.host.block.isConnected) {
      if (next === 'provided') disconnectTable(this.host.block)
      else connectTable(this.host.block)
    }
    this.host.report()
  }

  set providedRows(rows: readonly ProvidedRow[]) {
    const el = this.host.block
    const derived = deriveRowsOff(rows, this.host.columns(), this.host.calculations())
    el.rawRows = derived.rawRows
    el.dataRows = derived.dataRows
    el.dataDelivered = true
    this._rowsChoice.forget()
    el.bySelectionFiltered = false
    this._view.toPush()
    this.host.report()
  }

  reset(): void {
    const el = this.host.block
    el.rawRows = []
    el.dataRows = []
    el.dataDelivered = false
    this._rowsChoice.forget()
    el.bySelectionFiltered = false
    this._view.reset()
  }

  focusSearch(): boolean {
    return this._view.focusSearch()
  }

  setSearchText(text: string): void {
    this._view.setSearchText(text)
    this.host.report()
  }

  columnsSwitched(): void {
    this._widths.forget()
  }

  private get hasSource(): boolean {
    const inEditor = this.host.block.inEditor
    return this._ownership === 'provided' && !inEditor
      ? true
      : showsRealData(inEditor, this.host.source())
  }

  private get columnPickerOn(): boolean {
    return this.host.columnPicker() && this.host.headerRow() && !this.host.block.inEditor
  }

  private cellValue(rawIndex: number, slot: number): string {
    if (this.host.cellValue) return this.host.cellValue(rawIndex, slot)
    return this.host.block.dataRows[rawIndex]?.[slot] ?? ''
  }

  private readonly actionKey = (e: KeyboardEvent): void => {
    const el = this.host.block
    if (el.inEditor || e.defaultPrevented || e.key !== 'F4'
      || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (!chainsRead(el.getAttribute('data-ff-actions'))[KEY_F4]?.length) return
    e.preventDefault()
    e.stopPropagation()
    if (e.repeat) return
    const focus = focusedRawIndex(el.shadowRoot)

    const slot = focus === undefined ? this._rowsChoice.slotIn(el.rawRows) : focus
    const row = slot === null ? undefined : el.rawRows[slot]
    if (row === undefined) return
    setSelection(giverIdOf(el), row, true, rowsTraitOf(el, row))
    const record = rowsIndexOf(el, row)
    runEvent(el, KEY_F4, { PINDEX: record, DROP_PINDEX: record }).catch(reportChainsError)
  }

  private readonly locksReload = (e: KeyboardEvent): void => {
    if (!this.host.block.inEditor && e.key === 'F5' && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  registered(): void {
    const el = this.host.block
    el.addEventListener('keydown', this.actionKey)
    el.addEventListener('keydown', this.locksReload)
    if (this._ownership === 'softengine') connectTable(el)
    this._view.observe()
  }

  observe(): void {
    this._view.observe()
  }

  toRender(): void {
    this._view.toRender()
  }

  disconnected(): void {
    const el = this.host.block
    el.removeEventListener('keydown', this.actionKey)
    el.removeEventListener('keydown', this.locksReload)
    this._choice.resolve()
    this._view.resolve()
    disconnectTable(el)
  }

  private openColumnPicker(e: MouseEvent): void {
    const frame = this.host.block.shadowRoot?.querySelector('.tabelle')?.getBoundingClientRect()
    if (!frame) return
    this._choice.openAt(e, frame)
  }

  render(): TemplateResult {
    const el = this.host.block
    const columns = this.host.columns()
    const visible = columnsView(columns, el.inEditor, this._choice.away())
    const bottom = this.host.bottom?.() ?? null
    const decoration = this.host.decoration?.() ?? ((): RowDecoration => WITHOUT_DECORATION)

    const view = tableRenderModel({
      columns,
      rendered: visible.columns,
      slots: visible.slots,
      widthOf: (i) => this._widths.widthOf(i),
      hasSource: this.hasSource,
      dataDelivered: el.dataDelivered,
      dataRows: el.dataRows,
      searchText: this._view.searchText,
      sortColumn: this._view.sortColumn,
      sortOn: this._view.sortOn,
      wishPage: this._view.page,
      measured: this._view.metrics,
      takenRows: bottom?.count ?? 0,
      valueAt: (row, column) => this.cellValue(row, column),
      paging: this.host.paging(),
    })
    return html`<div class="tabelle" style=${styleMap({
      '--takt': `${view.tick}px`,
      '--zeilen-hoehe': `${view.rowsHeight}px`,
    })}>
      ${tableBody({
        columns: visible.columns,
        slots: visible.slots,
        cols: view.cols,
        editable: el.editable,
        inEditor: el.inEditor,
        showHead: this.host.headerRow(),
        columnPickerOn: this.columnPickerOn,
        columnPicker: this._choice.open === null ? null : {
          selectable: columns.filter((sp) => sp.hidden !== true),
          away: this._choice.away(),
          left: this._choice.open.left,
          top: this._choice.open.top,
        },
        selectionSemantics: giverIdOf(el) !== '',
        showSearch: this.host.search(),
        searchText: this._view.searchText,
        sortColumn: this._view.sortColumn,
        sortOn: this._view.sortOn,
        rows: view.rows,
        valueAt: (row, column) => this.cellValue(row, column),
        rulerTicks: view.rulerTicks,
        hasSource: view.hasSource,
        selectionIndex: this._rowsChoice.slotIn(el.rawRows),
        empty: view.empty,
        emptyText: this.host.emptyText(),
        decoration,
        bottom: bottom === null
          ? nothing
          : bottom.render({ view: visible, cols: view.cols, rulerTicks: view.rulerTicks }),
      }, {
        setSearchText: (text) => this._view.setSearchText(text),
        openColumnPicker: (e) => this.openColumnPicker(e),
        columnPicker: {
          toggle: (key) => this._choice.toggle(key),
          allShow: () => this._choice.allShow(),
          close: () => this._choice.close(),
        },
        widths: this._widths.hostForDrag(),
        clickHead: (i) => {
          if (!el.editable) this._view.clickSort(i)
        },
        activateRow: (rawIndex, viewIndex) => {
          activateRow(el, this._rowsChoice, el.rawRows, rawIndex, viewIndex)
          this.host.report()
        },
        rowDouble: (rawIndex) => rowDouble(el, el.rawRows, rawIndex),
      })}
      ${tableFoot({
        hasSource: view.hasSource,
        visible: view.total,
        total: el.dataRows.length,
        searchesActive: this._view.searchesActive,
        selectionActive: el.bySelectionFiltered,
        page: view.page,
        pageCount: view.pageCount,
        paging: this.host.paging(),
        totals: view.totals,
        empty: view.empty,
      }, {
        page: (to) => this._view.goToPage(to),
      })}
    </div>`
  }
}
