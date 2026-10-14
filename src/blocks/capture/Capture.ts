import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import type {
  CaptureCarrier,
  ChangeCarrier,
  PendingKind,
  RunReportElement,
  SentRowsElement,
  WrittenRow,
} from '../../core/block/capability'
import { CALCULATIONS_PROP, type Calculation } from '../../core/data/calculation'
import {
  hasRecordNumber,
  LIST_GRID,
  listCapabilities,
  RecordList,
  tableStyle,
  type RowDecoration,
  type RowsBelow,
} from '../list'
import { closeLookupFor, coerceLookupColumns } from '../lookup/lookup'
import { suggestionStyle } from '../lookup/suggestionList'
import { reportPendingMarks } from '../../runtime/pendingState'
import { runEvent } from '../../runtime/events'
import { LEADS_TO_TYPING_ATTR } from '../../core/block/typingMarks'
import { enterCell, cellsInputStyle, cellsFields } from './cells'
import { captureRowFor } from './controls'
import { capturedRowsTpl, captureDecoration } from './body'
import { CAPTURE_COLUMNS_BINDING, greyLine, type CaptureColumn } from './column'
import { CaptureLedger } from './ledger'
import { captureStyle } from './captureStyle'
import { captureProperties, type CaptureValues } from './properties'
import { WorkingRow } from './workingRow'
import type { SourceValue } from '../../core/block/sourceProperty'

// The event of a row captured: Enter or Tab past the last cell, arrow down
// out of the row, or a correction captured again.
const ROW_CAPTURED = 'onRowCaptured'

export interface Capture extends CaptureValues, SourceValue {}

export class Capture extends BlockElement
  implements CaptureCarrier, ChangeCarrier, SentRowsElement, RunReportElement {
  static readonly type = 'capture'
  static readonly tag = 'ff-capture'

  static override styles: CSSResultGroup = [
    BlockElement.styles,
    tableStyle,
    suggestionStyle,
    cellsInputStyle,
    captureStyle,
  ]

  @property({ attribute: false }) dataRows: string[][] = []

  @property({ attribute: false }) rawRows: unknown[] = []

  // A capture never pages; the list reads it as every list does.
  readonly paging = false

  private readonly _working = new WorkingRow(this)

  // The capture row became a position since the last drawing.
  private _justCaptured = false

  private readonly _ledger: CaptureLedger = new CaptureLedger({
    block: this,
    columns: () => this.listColumns(),
    layout: () => this._list.rowLayout(),
    calculations: () => this.listCalculations(),
    sourceId: () => this.source,
    rawRows: () => this.rawRows,
    dataRows: () => this.dataRows,
    report: () => this.requestUpdate(),
    focusCell: (index) => this.focusCaptureCell(index),
    captured: () => {
      this._justCaptured = true
      this.requestUpdate()
      this.focusCaptureCell(this._ledger.firstCell)
      this.showLastCaptured()
    },
    rowAdded: () => this.writeCaptured(),
  })

  // A run of the chain on "Zeile erfasst" is out; a row captured meanwhile
  // asks for one more.
  private _writing = false

  private _writeAgain = false

  private readonly _list: RecordList = new RecordList(this, {
    cellValue: (rawIndex, slot) => this._ledger.cellValue(rawIndex, slot),
    decoration: () => this.rowsDecoration(),
    required: (slot) => this.listColumns()[slot]?.required === true,
    greyLine: (shown) => greyLine(this.listColumns(), shown),
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

  rowWrites(kind: PendingKind, key: string): void {
    this._ledger.writes(kind, key)
  }

  rowFailed(kind: PendingKind, key: string): void {
    this._ledger.failed(kind, key)
  }

  runDone(kind: PendingKind, written: readonly WrittenRow[]): void {
    this._ledger.runDone(kind, written)
  }

  writtenArrived(): void {
    this._ledger.writtenArrived()
  }

  listColumns(): readonly CaptureColumn[] {
    return this.columns
  }

  listCalculations(): readonly Calculation[] {
    return this.calculations
  }

  private focusCaptureCell(index: number): void {
    void this.updateComplete.then(() => {
      enterCell(cellsFields(this.shadowRoot, '.row.capture', [index])[0])
    })
  }

  // Like SoftEngine's own entry, which creates the position when the row is
  // left (13.10.): the chain on "Zeile erfasst" runs as soon as a row is
  // captured. One run at a time; a row captured while a run is out goes with
  // the next. Each run takes the rows still pending, so a row goes once
  // (runEvent marks it out before its steps run). After a failed row the
  // capture does not try again by itself: the rows behind it wait, in their
  // order, until the operator corrects it, takes it away or saves.
  private writeCaptured(): void {
    if (this._writing) {
      this._writeAgain = true
      return
    }
    this._writing = true
    void (async () => {
      try {
        // The ledger finishes the capture before the run reads its rows.
        await Promise.resolve()
        do {
          this._writeAgain = false
          if (this._ledger.hasFailed()) break
          await runEvent(this, ROW_CAPTURED, {}).catch(() => undefined)
        } while (this._writeAgain)
      } finally {
        this._writing = false
      }
    })()
  }

  // The operator stays in the capture row: a click on a row below the line or
  // on the empty room under the rows puts the cursor back where typing goes
  // on, so the next position needs no hunt for the row.
  private backToTyping(): void {
    if (!this.preview) this.focusCaptureCell(this._ledger.openCell)
  }

  private readonly roomClick = (e: Event): void => {
    const spot = e.composedPath()[0]
    if (spot instanceof Element && spot.closest('.ruler') !== null) this.backToTyping()
  }

  private showLastCaptured(): void {
    void this.updateComplete.then(() => {
      const body = this.shadowRoot?.querySelector<HTMLElement>('.body')
      if (body) body.scrollTop = body.scrollHeight
    })
  }

  private get changePossible(): boolean {
    return this.source.trim() !== '' && hasRecordNumber(this)
  }

  private rowsDecoration(): (rawIndex: number | null) => RowDecoration {
    return captureDecoration({
      typable: this.changePossible,
      ledger: this._ledger,
    })
  }

  private underRows(): RowsBelow {
    const captured = this._ledger.capturedValues
    return {
      count: 1 + captured.length,
      render: ({ view, cols, layout, rulerTicks }) => {
        const correctionSlot = this._ledger.correctionSlot
        return capturedRowsTpl({
          slots: view.slots,
          cols,
          layout,
          captured,
          capturedState: (index) => this._ledger.capturedStatus(index),
          chosen: (index) => this._working.chosen(this._ledger.capturedKeyAt(index)),
          correctionSlot,
          capture: captureRowFor(
            {
              ledger: this._ledger,
              block: this,
              preview: this.preview,
              sourceId: this.source,
            },
            view,
            cols,
            layout,
            correctionSlot === null && (rulerTicks ?? 1) <= 0,
          ),
        }, {
          takeCapturedRow: (index) => {
            this._ledger.removeCaptured(index)
            this.backToTyping()
          },
          bringBackCapturedRow: (index) => this._ledger.bringBackCaptured(index),
          chooseCapturedRow: (index) => {
            this._working.toggleCaptured(this._ledger.capturedKeyAt(index), this.listColumns(), captured[index] ?? [])
            this.requestUpdate()
            this.backToTyping()
          },
        })
      },
    }
  }

  private readonly maskKey = (e: KeyboardEvent): void => {
    if (this.preview || e.key !== 'Insert') return
    const all = Array.from(this.ownerDocument.querySelectorAll<Capture>(Capture.tag))
    const path = e.composedPath()
    const responsible = all.find((t) => path.includes(t)) ?? all[0]
    if (responsible !== this) return
    e.preventDefault()
    this.focusCaptureCell(this._ledger.firstCell)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.maskKey)
    this.renderRoot.addEventListener('click', this.roomClick)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.maskKey)
    this.renderRoot.removeEventListener('click', this.roomClick)
    closeLookupFor(this)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this._ledger.refresh()
  }

  protected override updated(): void {
    reportPendingMarks(this)
    if (!this.preview) {
      // A click on the empty room under the rows leads into the capture row.
      this.renderRoot.querySelector('.ruler')?.setAttribute(LEADS_TO_TYPING_ATTR, '')
      this._working.followTyping(
        this.listColumns(),
        this._ledger.touched,
        () => this._ledger.rowView().map((cell) => cell.value),
        this._justCaptured,
      )
    }
    this._justCaptured = false
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
    ...listCapabilities(
      CAPTURE_COLUMNS_BINDING,
      { kind: 'source', helpers: 'apart' },
      [{ key: ROW_CAPTURED, name: 'Zeile erfasst' }],
    ),
    { kind: 'capture' },
    { kind: 'change', key: 'editable' },
    { kind: 'holdsSent' },
    { kind: 'compute', prop: CALCULATIONS_PROP },
    {
      kind: 'lookupWindow',
      window: {
        entriesProp: 'columns',
        windowFields: (entry) => coerceLookupColumns((entry as CaptureColumn).windowColumns).map((c) => c.field),
      },
    },
  ],
  contracts: { capture: Capture, change: Capture, holdsSent: Capture },
  grid: LIST_GRID,
})
