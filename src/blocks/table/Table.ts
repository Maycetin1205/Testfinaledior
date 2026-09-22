import { type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { emptyStyle } from '../behavior/emptyState'
import { LIST_GRID, ListState, listCapabilities } from '../behavior/listState'
import { COLUMNS_BINDING, coerceColumns } from '../behavior/columns'
import { tableStyle } from '../behavior/tableStyle'
import type { ProvidedRow, DataOwnership } from '../behavior/rowLink'
import { tableProperties, type TableValues } from './properties'

export interface Table extends TableValues {}

export class Table extends BlockElement {
  static readonly type = 'table'
  static readonly tag = 'ff-table'

  static override styles: CSSResultGroup = [BlockElement.styles, emptyStyle, tableStyle]

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  @property({ attribute: false }) bySelectionFiltered = false

  @property({ attribute: false }) dataDelivered = false

  private readonly _list = new ListState({
    block: this,
    report: () => this.requestUpdate(),
    columns: () => coerceColumns(this.columns),
    calculations: () => [],

    writeColumns: (columns) => {
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail: { attr: 'columns', value: columns },
        bubbles: true,
        composed: true,
      }))
    },
    source: () => this.source,
    search: () => this.search,
    paging: () => this.paging,
    headerRow: () => this.headerRow,
    columnPicker: () => this.columnPicker,
    emptyText: () => this.emptyText,
  })

  get ownership(): DataOwnership {
    return this._list.ownership
  }

  set ownership(next: DataOwnership) {
    this._list.ownership = next
  }

  set providedRows(rows: readonly ProvidedRow[]) {
    this._list.providedRows = rows
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
