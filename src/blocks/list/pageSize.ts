export const ROWS_HEIGHT = 28

// The grey line under a row, smaller than the row itself.
export const SUBLINE_HEIGHT = 22

export const WITHOUT_MEASUREMENT = 10

const PLACEHOLDER_WITHOUT_MEASUREMENT = 4

export function placeholderRows(measured: number | null): number {
  return measured ?? PLACEHOLDER_WITHOUT_MEASUREMENT
}

function headRows(headHeight: number, tick: number): number {
  return Math.max(1, Math.floor(headHeight / tick))
}

// A record takes a row and, with a grey line, the line under it. Where the
// list has a grey line, a page counts every record with one.
function fittingRows(
  bodyHeight: number,
  heads: number,
  rowsHeight: number,
  sub: number,
): number {
  return Math.max(1, Math.floor((bodyHeight - heads * rowsHeight) / (rowsHeight + sub)))
}

export interface RowMetrics {
  fit: number

  rowsHeight: number
}

function rowMetrics(
  bodyHeight: number,
  headHeight: number,
  tick: number,
  sub: number,
): RowMetrics {
  const heads = headRows(headHeight, tick)
  const fit = fittingRows(bodyHeight, heads, tick, sub)
  // A row with a grey line keeps its height: stretched, the row would drift
  // away from the grey line under it. The room left stays below the rows.
  if (sub > 0) return { fit, rowsHeight: tick }
  const height = bodyHeight / (fit + heads)
  if (height < tick) return { fit, rowsHeight: tick }
  return { fit, rowsHeight: Math.floor(height * 100) / 100 }
}

export function rulerTicks(fit: number | null, rendered: number): number | null {
  if (fit === null) return null
  return Math.max(0, fit - rendered)
}

interface Split {
  pages: number

  page: number

  rows: (number | null)[]
}

interface SplitQuestion {
  visible: readonly number[]

  // False in the editor: placeholder rows stand in for data that is not there.
  showsRows: boolean
  perPage: number

  wantedPage: number

  placeholderRows: number
}

export function scrollSplit({
  visible,
  showsRows,
  placeholderRows,
}: SplitQuestion): Split {
  if (!showsRows) {
    return { pages: 1, page: 0, rows: Array.from({ length: placeholderRows }, () => null) }
  }
  return { pages: 1, page: 0, rows: [...visible] }
}

export function pagesSplit({
  visible,
  showsRows,
  perPage,
  wantedPage,
  placeholderRows,
}: SplitQuestion): Split {
  const pages = showsRows ? Math.max(1, Math.ceil(visible.length / perPage)) : 1

  const page = Math.min(Math.max(wantedPage, 0), pages - 1)
  if (!showsRows) {
    return { pages, page, rows: Array.from({ length: placeholderRows }, () => null) }
  }
  return { pages, page, rows: [...visible.slice(page * perPage, (page + 1) * perPage)] }
}

export const WITHOUT_BODY = -1

export interface MeasureTarget {
  hasAttribute(name: string): boolean
  renderRoot: { querySelector(selection: string): Element | null }
}

interface BodyMeasure {
  metrics: RowMetrics | null

  height: number

  head: number
}

export function bodyHeight(target: MeasureTarget): number {
  if (!target.hasAttribute('fills')) return WITHOUT_BODY
  const body = target.renderRoot.querySelector('.body')
  return body instanceof HTMLElement ? body.clientHeight : WITHOUT_BODY
}

export function headHeight(target: MeasureTarget): number {
  const head = target.renderRoot.querySelector('.head')
  return head instanceof HTMLElement ? head.offsetHeight : 0
}

export function measuredMetrics(target: MeasureTarget, tick: number, sub = 0): BodyMeasure {
  const height = bodyHeight(target)
  if (height === WITHOUT_BODY) return { metrics: null, height, head: 0 }
  const head = headHeight(target)
  return { metrics: rowMetrics(height, head, tick, sub), height, head }
}

export function observeBody(target: MeasureTarget, onChange: () => void): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  const body = target.renderRoot.querySelector('.body')
  if (!body) return null
  const observers = new ResizeObserver(onChange)
  observers.observe(body)
  return observers
}
