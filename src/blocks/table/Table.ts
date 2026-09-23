import { type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { Calculation } from '../../core/data/calculation'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { LIST_GRID, listCapabilities } from '../behavior/listDeclaration'
import { RecordList } from '../behavior/recordList'
import { COLUMNS_BINDING, coerceColumns, type Column } from '../behavior/columns'
import { tableStyle } from '../behavior/tableStyle'
import {
  WITHOUT_ROWS,
  type HandedRow,
  type RowsFrom,
  type RowsReport,
} from '../behavior/sourceRows'
import { tableProperties, type TableValues } from './properties'

export interface Table extends TableValues {}

export class Table extends BlockElement {
  static readonly type = 'table'
  static readonly tag = 'ff-table'

  static override styles: CSSResultGroup = [BlockElement.styles, tableStyle]

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  @property({ attribute: false }) rowsReport: RowsReport = WITHOUT_ROWS

  private readonly _list = new RecordList(this)

  listColumns(): readonly Column[] {
    return coerceColumns(this.columns)
  }

  listCalculations(): readonly Calculation[] {
    return []
  }

  get rowsFrom(): RowsFrom {
    return this._list.rowsFrom
  }

  set rowsFrom(next: RowsFrom) {
    this._list.rowsFrom = next
  }

  set handedRows(rows: readonly HandedRow[]) {
    this._list.handedRows = rows
  }

  focusSearch(): boolean {
    return this._list.focusSearch()
  }

  setSearchText(text: string): void {
    this._list.setSearchText(text)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this._list.registered()
  }

  protected override firstUpdated(): void {
    this._list.observe()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('columns')) this._list.columnsSwitched()
  }

  protected override updated(): void {
    this._list.toRender()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._list.disconnected()
  }

  override render(): TemplateResult {
    return this._list.render()
  }
}

defineBlock(Table, {
  name: 'Tabelle',
  category: 'display',
  properties: tableProperties,
  capabilities: listCapabilities(COLUMNS_BINDING),
  grid: LIST_GRID,
})
