import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import type { WrittenRow, Delivery, PendingKind } from '../../core/block/capability'
import {
  CALCULATIONS_PROP,
  calculationsFrom,
  type Calculation,
} from '../../core/data/calculation'
import { reportError } from '../../softengine/report'
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
import { CaptureState } from './state'
import { captureRowFor, type CaptureHost } from './controls'
import { capturedRowsTpl, captureDecoration } from './body'
import {
  CAPTURE_COLUMNS_BINDING,
  coerceCaptureColumns,
  type CaptureColumn,
} from './column'
import type { CaptureContext } from './row'
import { RowsEditing } from './rowEditing'
import { RunState, type RowsIcon } from './rowStatus'
import { captureStyle } from './captureStyle'
import { captureProperties, type CaptureValues } from './properties'

const NOT_ARRIVED = 'Nicht im Beleg angekommen.'

const NOT_CHANGED = 'Im Beleg unverändert geblieben.'

const NOT_DELETED = 'Steht noch im Beleg.'

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

  private readonly _capture = new CaptureState()

  private readonly _run = new RunState(() => this.requestUpdate())

  private readonly _rows = new RowsEditing({
    block: this,
    columns: () => this.listColumns(),
    calculations: () => this.listCalculations(),
    rawRows: () => this.rawRows,
    dataRows: () => this.dataRows,
    report: () => this.requestUpdate(),
    run: this._run,
    focusCaptureCell: (index) => this.focusCaptureCell(index),
  })

  private readonly _list = new RecordList(this, {
    cellValue: (rawIndex, slot) => this._rows.cellValue(rawIndex, slot),
    decoration: () => this.rowsDecoration(),
    bottom: () => this.underRows(),
  })

  get capturedRows(): readonly (readonly string[])[] {
    return this._capture.pendingMarks(this.captureContext()).map((v) => v.values)
  }

  get capturedKey(): readonly string[] {
    return this._capture.pendingMarks(this.captureContext()).map((v) => v.key)
  }

  get changedRows(): readonly { record: string; values: readonly string[] }[] {
    return this._rows.changedRows
  }

  get deletedRows(): readonly { record: string; values: readonly string[] }[] {
    return this._rows.deletedRows
  }

  rowWrites(kind: PendingKind, key: string): void {
    this._run.writes(kind, key)
  }

  rowFailed(kind: PendingKind, key: string, message: string): void {
    this._run.failed(kind, key, message)
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    const key = written.map((z) => z.key)
    this._run.done(kind, key)
    if (kind === 'captured') {
      if (this._capture.markWritten(this.captureContext(), written)) {
        this.requestUpdate()
      }
      return
    }
    this._rows.remove(kind, key)
  }

  checkArrival(delivery: Delivery | null): void {
    const report = this._capture.checkArrival(delivery, this.listColumns())
    for (const key of report.missing) {
      this._run.failed('captured', key, NOT_ARRIVED)
    }
    const booked = this._rows.checkArrival(delivery)
    for (const record of booked.changeMissing) {
      this._run.failed('changed', record, NOT_CHANGED)
    }
    for (const record of booked.deletionMissing) {
      this._run.failed('deleted', record, NOT_DELETED)
    }

    const message = [report.message, booked.message].filter((text) => text !== '').join(' ')
    if (message !== '') reportError(message)
    if (report.changed || booked.moved) this.requestUpdate()
  }

  listColumns(): CaptureColumn[] {
    return coerceCaptureColumns(this.columns)
  }

  listCalculations(): readonly Calculation[] {
    return calculationsFrom(this.calculations)
  }

  private captureContext(): CaptureContext {
    return this._capture.context(
      this,
      this.listColumns(),
      this.source,
      this.listCalculations(),
    )
  }

  private captureHost(): CaptureHost {
    return {
      block: this,
      run: this._capture.run,
      context: () => this.captureContext(),
      report: () => this.requestUpdate(),
      focus: (index) => this.focusCaptureCell(index),
      captureRow: () => this.captureRow(),

      titleInCell: () => !this.headerRow,
      windowMetrics: () => ({
        width: validMetrics(this.windowWidth, WINDOW_WIDTH),
        height: validMetrics(this.windowHeight, WINDOW_HEIGHT),
      }),
    }
  }

  private focusCaptureCell(index: number): void {
    void this.updateComplete.then(() => {
      walkInCell(cellsFields(this.shadowRoot, '.zeile.erfassung', index)[0])
    })
  }

  private captureRow(): boolean {
    if (!this._capture.capture(this.captureContext())) return false
    this.requestUpdate()
    this.focusCaptureCell(0)
    this.showLastCaptured()
    return true
  }

  private showLastCaptured(): void {
    void this.updateComplete.then(() => {
      const body = this.shadowRoot?.querySelector<HTMLElement>('.koerper')
      if (body) body.scrollTop = body.scrollHeight
    })
  }

  private capturedState(index: number): RowsIcon {
    return this._run.shows(
      'captured',
      this._capture.key[index] ?? '',
      this._capture.isWritten(index) ? 'written' : 'captured',
    )
  }

  private get changePossible(): boolean {
    return !this.inEditor && this.source.trim() !== '' && hasRecordNumber(this)
  }

  private rowsDecoration(): (rawIndex: number | null) => RowDecoration {
    return captureDecoration({
      inEditor: this.inEditor,
      deletable: this.deletable,
      typable: this.changePossible,
      rows: this._rows,
    })
  }

  private underRows(): Sublines {
    const captured = this._capture.rows
    return {
      count: 1 + captured.length,
      render: ({ view, cols, rulerTicks }) => {
        const correctionSlot = this._capture.correctionSlot
        return capturedRowsTpl({
          columns: view.columns,
          slots: view.slots,
          cols,
          inEditor: this.inEditor,
          captured,
          capturedState: (index) => this.capturedState(index),
          correctionSlot,
          capture: captureRowFor(
            this.captureHost(),
            cols,

            correctionSlot === null && (rulerTicks ?? 1) <= 0,
            view,
          ),
        }, {
          takeCapturedRow: (index) => {
            if (this._capture.remove(index)) this.requestUpdate()
          },
          holeCapturedRow: (index) => {
            if (!this._capture.bringBack(this.captureContext(), index)) return
            this.requestUpdate()
            this.focusCaptureCell(0)
          },
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
    this._capture.run.refreshSuggestions(this.captureContext())
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
        automatic: 'Ohne Spalten zeigt das Fenster eine: das Feld dieser Spalte.',
      },
    },
  ],
  grid: LIST_GRID,
})
