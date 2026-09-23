import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import type { WrittenRow, Delivery, PendingKind } from '../../core/block/capability'
import {
  CALCULATIONS_PROP,
  calculationsFrom,
  type Calculation,
} from '../../core/data/calculation'
import { emptyStyle } from '../behavior/emptyState'
import { LIST_GRID, listCapabilities } from '../behavior/listDeclaration'
import { RecordList } from '../behavior/recordList'
import { tableStyle } from '../behavior/tableStyle'
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  validMetrics,
  closeLookupFor,
} from '../behavior/lookup'
import { suggestionStyle } from '../behavior/suggestionList'
import { reportPendingMarks } from '../behavior/pendingState'
import { walkInCell, cellsInputStyle, cellsFields } from './cells'
import { hasRecordNumber, WITHOUT_ROWS, type RowsReport } from '../behavior/sourceRows'
import type { Sublines, RowDecoration } from '../behavior/tableBody'
import { captureRowFor } from './controls'
import { capturedRowsTpl, captureDecoration } from './body'
import {
  CAPTURE_COLUMNS_BINDING,
  coerceCaptureColumns,
  type CaptureColumn,
} from './column'
import { CaptureLedger } from './ledger'
import { captureStyle } from './captureStyle'
import { captureProperties, type CaptureValues } from './properties'

export interface Capture extends CaptureValues {}

export class Capture extends BlockElement {
  static readonly type = 'capture'
  static readonly tag = 'ff-capture'

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    emptyStyle,
    tableStyle,
    suggestionStyle,
    cellsInputStyle,
    captureStyle,
  ]

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  @property({ attribute: false }) rowsReport: RowsReport = WITHOUT_ROWS

  private readonly _ledger = new CaptureLedger({
    block: this,
    columns: () => this.listColumns(),
    calculations: () => this.listCalculations(),
    sourceId: () => this.source,
    rawRows: () => this.rawRows,
    dataRows: () => this.dataRows,
    report: () => this.requestUpdate(),
    focusCell: (index) => this.focusCaptureCell(index),
    captured: () => {
      this.requestUpdate()
      this.focusCaptureCell(0)
      this.showLastCaptured()
    },
  })

  private readonly _list = new RecordList(this, {
    cellValue: (rawIndex, slot) => this._ledger.cellValue(rawIndex, slot),
    decoration: () => this.rowsDecoration(),
    bottom: () => this.underRows(),
  })

  get capturedRows(): readonly (readonly string[])[] {
    return this._ledger.pendingMarks().map((v) => v.values)
  }

  get capturedKey(): readonly string[] {
    return this._ledger.pendingMarks().map((v) => v.key)
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this._ledger.changedRows
  }

  get deletedRows(): readonly { record: string; values: readonly string[] }[] {
    return this._ledger.deletedRows
  }

  rowWrites(kind: PendingKind, key: string): void {
    this._ledger.writes(kind, key)
  }

  rowFailed(kind: PendingKind, key: string, message: string): void {
    this._ledger.failed(kind, key, message)
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    this._ledger.runDone(kind, written)
  }

  checkArrival(delivery: Delivery | null): void {
    this._ledger.checkArrival(delivery)
  }

  listColumns(): CaptureColumn[] {
    return coerceCaptureColumns(this.columns)
  }

  listCalculations(): readonly Calculation[] {
    return calculationsFrom(this.calculations)
  }

  private focusCaptureCell(index: number): void {
    void this.updateComplete.then(() => {
      walkInCell(cellsFields(this.shadowRoot, '.zeile.erfassung', index)[0])
    })
  }

  private showLastCaptured(): void {
    void this.updateComplete.then(() => {
      const body = this.shadowRoot?.querySelector<HTMLElement>('.koerper')
      if (body) body.scrollTop = body.scrollHeight
    })
  }

  private get changePossible(): boolean {
    return !this.inEditor && this.source.trim() !== '' && hasRecordNumber(this)
  }

  private rowsDecoration(): (rawIndex: number | null) => RowDecoration {
    return captureDecoration({
      inEditor: this.inEditor,
      deletable: this.deletable,
      typable: this.changePossible,
      ledger: this._ledger,
    })
  }

  private underRows(): Sublines {
    const captured = this._ledger.capturedValues
    return {
      count: 1 + captured.length,
      render: ({ view, cols, rulerTicks }) => {
        const correctionSlot = this._ledger.correctionSlot
        return capturedRowsTpl({
          columns: view.columns,
          slots: view.slots,
          cols,
          inEditor: this.inEditor,
          captured,
          capturedState: (index) => this._ledger.capturedStatus(index),
          correctionSlot,
          capture: captureRowFor(
            {
              ledger: this._ledger,
              block: this,
              inEditor: this.inEditor,
              titleInCell: !this.headerRow,
              sourceId: this.source,
              windowWidth: validMetrics(this.windowWidth, WINDOW_WIDTH),
              windowHeight: validMetrics(this.windowHeight, WINDOW_HEIGHT),
            },
            cols,

            correctionSlot === null && (rulerTicks ?? 1) <= 0,
            view,
          ),
        }, {
          takeCapturedRow: (index) => this._ledger.removeCaptured(index),
          holeCapturedRow: (index) => this._ledger.bringBackCaptured(index),
        })
      },
    }
  }

  private readonly maskKey = (e: KeyboardEvent): void => {
    if (this.inEditor || e.key !== 'Insert') return
    const all = Array.from(this.ownerDocument.querySelectorAll<Capture>(Capture.tag))
    const path = e.composedPath()
    const responsible = all.find((t) => path.includes(t)) ?? all[0]
    if (responsible !== this) return
    e.preventDefault()
    this.focusCaptureCell(0)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this._list.registered()
    document.addEventListener('keydown', this.maskKey)
  }

  protected override firstUpdated(): void {
    this._list.observe()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._list.disconnected()
    document.removeEventListener('keydown', this.maskKey)
    closeLookupFor(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('columns')) this._list.columnsSwitched()
    if (this.inEditor) return
    this._ledger.refresh()
  }

  protected override updated(): void {
    this._list.toRender()
    reportPendingMarks(this)
  }

  override render(): TemplateResult {
    return this._list.render()
  }
}

defineBlock(Capture, {
  name: 'Erfassung',
  category: 'input',
  properties: captureProperties,
  capabilities: [
    ...listCapabilities(CAPTURE_COLUMNS_BINDING),
    { kind: 'capture' },
    { kind: 'change', key: 'editable' },
    { kind: 'delete', when: { key: 'deletable', equals: true } },
    { kind: 'holdsSent' },
    { kind: 'compute', prop: CALCULATIONS_PROP },
    {
      kind: 'lookupWindow',
      window: {
        entriesProp: 'columns',
        titleKey: 'title',
        sourceKey: 'fillField',
        columnsKey: 'windowColumns',
        widthKey: 'windowWidth',
        heightKey: 'windowHeight',
      },
    },
  ],
  grid: LIST_GRID,
})
