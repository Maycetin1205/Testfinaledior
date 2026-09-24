import {
  observeBody,
  measuredMetrics,
  headHeight,
  WITHOUT_BODY,
  bodyHeight,
  ROWS_HEIGHT,
  type MeasureTarget,
  type RowMetrics,
} from './pageSize'
import { focusedRawIndex, restoreRowsFocus } from './rowActivation'
import { rememberedSorting } from './sorting'

// The element whose view the operator changes.
export interface ViewElement extends HTMLElement, MeasureTarget {
  readonly preview: boolean
  editable: boolean
  requestUpdate: () => void
}

// What the operator chose about the view: search text, sort column, page — plus
// how many rows the body currently fits.
export class ViewChoices {
  private readonly el: ViewElement

  private readonly columns: () => readonly { key: string }[]

  private _searchText = ''

  private _sortColumn = -1
  private _sortAscending = true
  private _rememberedRead = false

  private _page = 0

  private _metrics: RowMetrics | null = null
  private _observers: ResizeObserver | null = null

  private _tickMeasured = 0

  private _bodyMeasured = WITHOUT_BODY

  private _headMeasured = 0

  private _focusRow: number | null = null
  private _restoreFocus = false

  constructor(el: ViewElement, columns: () => readonly { key: string }[]) {
    this.el = el
    this.columns = columns
  }

  get searchText(): string {
    return this._searchText
  }

  get searchesActive(): boolean {
    return this._searchText.trim() !== ''
  }

  // Only the mask remembers what the operator sorted by; in the editor the
  // builder's own order stands.
  private get remembers(): boolean {
    return !this.el.preview
  }

  private readRemembered(): void {
    if (this._rememberedRead) return
    this._rememberedRead = true
    if (!this.remembers) return
    const state = rememberedSorting.read(this.el)
    if (state === null) return

    const slot = this.columns().findIndex((s) => s.key === state.key)
    if (slot < 0) return
    this._sortColumn = slot
    this._sortAscending = state.ascending
  }

  private rememberSorting(): void {
    if (!this.remembers) return
    const key = this.columns()[this._sortColumn]?.key ?? ''
    rememberedSorting.remember(
      this.el,
      this._sortColumn < 0 || key === '' ? null : { key, ascending: this._sortAscending },
    )
  }

  get sortColumn(): number {
    this.readRemembered()
    return this._sortColumn
  }

  get sortAscending(): boolean {
    this.readRemembered()
    return this._sortAscending
  }

  get page(): number {
    return this._page
  }

  get metrics(): RowMetrics | null {
    return this._metrics
  }

  setSearchText(text: string): void {
    this.rememberRowsFocus()
    this._searchText = text
    this._page = 0
    this.el.requestUpdate()
  }

  clickSort(index: number): void {
    if (this.el.editable) return
    this.rememberRowsFocus()

    this.readRemembered()
    if (this._sortColumn === index) {
      this._sortAscending = !this._sortAscending
    } else {
      this._sortColumn = index
      this._sortAscending = true
    }
    this._page = 0
    this.rememberSorting()
    this.el.requestUpdate()
  }

  goToPage(to: number): void {
    this.rememberRowsFocus()
    this._page = to
    this.el.requestUpdate()
  }

  focusSearch(): boolean {
    const field = this.el.shadowRoot?.querySelector<HTMLInputElement>('.search-row input')
    if (!field) return false
    field.focus()
    return true
  }

  private rememberRowsFocus(): void {
    const raw = focusedRawIndex(this.el.shadowRoot)
    this._restoreFocus = raw !== undefined
    this._focusRow = raw ?? null
  }

  private measureBody(): void {
    this._tickMeasured = ROWS_HEIGHT
    const { metrics, height, head } = measuredMetrics(this.el, ROWS_HEIGHT)
    this._bodyMeasured = height
    this._headMeasured = head
    if (metrics?.fit === this._metrics?.fit && metrics?.rowsHeight === this._metrics?.rowsHeight) return
    this._metrics = metrics
    this.el.requestUpdate()
  }

  observe(): void {
    if (this._observers) return
    this._observers = observeBody(this.el, () => this.measureBody())
    if (this._observers) this.measureBody()
  }

  afterRender(): void {
    if (this._tickMeasured !== ROWS_HEIGHT
      || this._bodyMeasured !== bodyHeight(this.el)
      || this._headMeasured !== headHeight(this.el)) {
      this.measureBody()
    }
    if (!this._restoreFocus) return
    this._restoreFocus = false
    restoreRowsFocus(this.el.shadowRoot, this._focusRow)
  }

  detach(): void {
    this._observers?.disconnect()
    this._observers = null
  }

  invalidate(): void {
    this._page = 0
    this._metrics = null
    this._tickMeasured = 0
    this._bodyMeasured = WITHOUT_BODY
    this._headMeasured = 0
  }

  reset(): void {
    this._searchText = ''
    this._sortColumn = -1
    this._sortAscending = true

    if (this._rememberedRead) this.rememberSorting()
    this.invalidate()
    this._focusRow = null
    this._restoreFocus = false
  }
}
