import {
  observeBody,
  measuredMetrics,
  headHeight,
  WITHOUT_BODY,
  bodyHeight,
  ROWS_HEIGHT,
  type MessTarget,
  type RowMetrics,
} from './pageSize'
import { focusedRawIndex, spotRowsFocusFrom } from './rowActivation'
import { rememberedSorting } from './sorting'

// The element whose view the operator changes.
export interface ViewElement extends HTMLElement, MessTarget {
  inEditor: boolean
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
  private _sortOn = true
  private _rememberedRead = false

  private _page = 0

  private _metrics: RowMetrics | null = null
  private _observers: ResizeObserver | null = null

  private _tickMeasured = 0

  private _bodyMeasured = WITHOUT_BODY

  private _headMeasured = 0

  private _focusRow: number | null = null
  private _focusFetch = false

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
    return !this.el.inEditor
  }

  private holeRemembered(): void {
    if (this._rememberedRead) return
    this._rememberedRead = true
    if (!this.remembers) return
    const state = rememberedSorting.read(this.el)
    if (state === null) return

    const slot = this.columns().findIndex((s) => s.key === state.key)
    if (slot < 0) return
    this._sortColumn = slot
    this._sortOn = state.on
  }

  private rememberSorting(): void {
    if (!this.remembers) return
    const key = this.columns()[this._sortColumn]?.key ?? ''
    rememberedSorting.remember(
      this.el,
      this._sortColumn < 0 || key === '' ? null : { key, on: this._sortOn },
    )
  }

  get sortColumn(): number {
    this.holeRemembered()
    return this._sortColumn
  }

  get sortOn(): boolean {
    this.holeRemembered()
    return this._sortOn
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

    this.holeRemembered()
    if (this._sortColumn === index) {
      this._sortOn = !this._sortOn
    } else {
      this._sortColumn = index
      this._sortOn = true
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
    this._focusFetch = raw !== undefined
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

  toRender(): void {
    if (this._tickMeasured !== ROWS_HEIGHT
      || this._bodyMeasured !== bodyHeight(this.el)
      || this._headMeasured !== headHeight(this.el)) {
      this.measureBody()
    }
    if (!this._focusFetch) return
    this._focusFetch = false
    spotRowsFocusFrom(this.el.shadowRoot, this._focusRow)
  }

  resolve(): void {
    this._observers?.disconnect()
    this._observers = null
  }

  toPush(): void {
    this._page = 0
    this._metrics = null
    this._tickMeasured = 0
    this._bodyMeasured = WITHOUT_BODY
    this._headMeasured = 0
  }

  reset(): void {
    this._searchText = ''
    this._sortColumn = -1
    this._sortOn = true

    if (this._rememberedRead) this.rememberSorting()
    this.toPush()
    this._focusRow = null
    this._focusFetch = false
  }
}
