import {
  observeBody,
  measuredMetrics,
  headHeight,
  WITHOUT_BODY,
  bodyHeight,
  type MessTarget,
  type RowMetrics,
} from './pageSize'
import { focusedRawIndex, spotRowsFocusFrom } from './rowActivation'
import { rememberedSorting } from './sorting'

export interface ViewHost {
  block: HTMLElement & MessTarget

  editable: () => boolean

  rowsHeight: () => number

  report: () => void

  columns: () => readonly { key: string }[]

  remembersSorting: () => boolean
}

export class ViewState {
  private readonly host: ViewHost

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

  constructor(host: ViewHost) {
    this.host = host
  }

  get searchText(): string {
    return this._searchText
  }

  get searchesActive(): boolean {
    return this._searchText.trim() !== ''
  }

  private holeRemembered(): void {
    if (this._rememberedRead) return
    this._rememberedRead = true
    if (!this.host.remembersSorting()) return
    const state = rememberedSorting.read(this.host.block)
    if (state === null) return

    const slot = this.host.columns().findIndex((s) => s.key === state.key)
    if (slot < 0) return
    this._sortColumn = slot
    this._sortOn = state.on
  }

  private rememberSorting(): void {
    if (!this.host.remembersSorting()) return
    const key = this.host.columns()[this._sortColumn]?.key ?? ''
    rememberedSorting.remember(
      this.host.block,
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
    this.host.report()
  }

  clickSort(index: number): void {
    if (this.host.editable()) return
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
    this.host.report()
  }

  goToPage(to: number): void {
    this.rememberRowsFocus()
    this._page = to
    this.host.report()
  }

  focusSearch(): boolean {
    const field = this.host.block.shadowRoot
      ?.querySelector<HTMLInputElement>('.suchzeile input')
    if (!field) return false
    field.focus()
    return true
  }

  private rememberRowsFocus(): void {
    const raw = focusedRawIndex(this.host.block.shadowRoot)
    this._focusFetch = raw !== undefined
    this._focusRow = raw ?? null
  }

  private measureBody(): void {
    const tick = this.host.rowsHeight()
    this._tickMeasured = tick
    const { metrics, height, head } = measuredMetrics(this.host.block, tick)
    this._bodyMeasured = height
    this._headMeasured = head
    if (metrics?.fit === this._metrics?.fit && metrics?.rowsHeight === this._metrics?.rowsHeight) return
    this._metrics = metrics
    this.host.report()
  }

  observe(): void {
    if (this._observers) return
    this._observers = observeBody(this.host.block, () => this.measureBody())
    if (this._observers) this.measureBody()
  }

  toRender(): void {
    if (this._tickMeasured !== this.host.rowsHeight()
      || this._bodyMeasured !== bodyHeight(this.host.block)
      || this._headMeasured !== headHeight(this.host.block)) {
      this.measureBody()
    }
    if (!this._focusFetch) return
    this._focusFetch = false
    spotRowsFocusFrom(this.host.block.shadowRoot, this._focusRow)
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
