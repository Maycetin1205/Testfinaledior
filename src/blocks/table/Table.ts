import { type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import type { Capability } from '../../core/block/capability'
import { EMPTY_TEXT_STANDARD, emptyStyle } from '../behavior/emptyState'
import {
  LIST_GRID,
  ListState,
  listProperties,
  listCapabilities,
} from '../behavior/listState'
import {
  COLUMNS_BINDING,
  coerceColumns,
  standardColumns,
  type Column,
} from '../behavior/columns'
import { tableStyle } from '../behavior/tableStyle'
import type { ProvidedRow, DataOwnership } from '../behavior/rowLink'

export class Table extends BlockElement {
  static readonly type = 'table'
  static readonly tag = 'ff-table'
  static readonly displayName = 'Tabelle'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = listCapabilities(COLUMNS_BINDING)

  static readonly blockProperties = listProperties()

  static readonly grid = LIST_GRID

  static override styles: CSSResultGroup = [BlockElement.styles, emptyStyle, tableStyle]

  columns: Column[] = standardColumns()

  source = ''

  search = true

  paging = true

  headerRow = true

  columnPicker = false

  dayField = ''

  emptyText = EMPTY_TEXT_STANDARD

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

BlockElement.defineAndRegister(Table)
