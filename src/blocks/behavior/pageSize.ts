export const ROWS_HEIGHT = 28

export const WITHOUT_MEASUREMENT = 10

const PLACEHOLDER_WITHOUT_MEASUREMENT = 4

export function placeholderRows(measured: number | null): number {
  return measured ?? PLACEHOLDER_WITHOUT_MEASUREMENT
}

function headRows(headHeight: number, tick: number): number {
  return Math.max(1, Math.floor(headHeight / tick))
}

function fittingRows(
  bodyHeight: number,
  heads: number,
  rowsHeight: number,
): number {
  return Math.max(1, Math.floor(bodyHeight / rowsHeight) - heads)
}

export interface RowMetrics {
  fit: number

  rowsHeight: number
}

export function rowMetrics(
  bodyHeight: number,
  headHeight: number,
  tick: number,
): RowMetrics {
  const heads = headRows(headHeight, tick)
  const fit = fittingRows(bodyHeight, heads, tick)
  const height = bodyHeight / (fit + heads)
  if (height < tick) return { fit, rowsHeight: tick }
  return { fit, rowsHeight: Math.floor(height * 100) / 100 }
}

export function rulerTicks(fit: number | null, rendered: number): number | null {
  if (fit === null) return null
  return Math.max(0, fit - rendered)
}

export interface Split {
  pages: number

  page: number

  rows: (number | null)[]
}

export interface SplitQuestion {
  visible: readonly number[]

  hasSource: boolean
  perPage: number

  wishPage: number

  placeholderRows: number
}

export function scrollSplit({
  visible,
  hasSource,
  placeholderRows,
}: SplitQuestion): Split {
  if (!hasSource) {
    return { pages: 1, page: 0, rows: Array.from({ length: placeholderRows }, () => null) }
  }
  return { pages: 1, page: 0, rows: [...visible] }
}

export function pagesSplit({
  visible,
  hasSource,
  perPage,
  wishPage,
  placeholderRows,
}: SplitQuestion): Split {
  const pages = hasSource ? Math.max(1, Math.ceil(visible.length / perPage)) : 1

  const page = Math.min(Math.max(wishPage, 0), pages - 1)
  if (!hasSource) {
    return { pages, page, rows: Array.from({ length: placeholderRows }, () => null) }
  }
  return { pages, page, rows: [...visible.slice(page * perPage, (page + 1) * perPage)] }
}

export const WITHOUT_BODY = -1

export interface MessTarget {
  hasAttribute(name: string): boolean
  renderRoot: { querySelector(selection: string): Element | null }
}

export interface BodyMeasure {
  metrics: RowMetrics | null

  height: number

  head: number
}

export function bodyHeight(target: MessTarget): number {
  if (!target.hasAttribute('fills')) return WITHOUT_BODY
  const body = target.renderRoot.querySelector('.koerper')
  return body instanceof HTMLElement ? body.clientHeight : WITHOUT_BODY
}

export function headHeight(target: MessTarget): number {
  const head = target.renderRoot.querySelector('.kopf')
  return head instanceof HTMLElement ? head.offsetHeight : 0
}

export function measuredMetrics(target: MessTarget, tick: number): BodyMeasure {
  const height = bodyHeight(target)
  if (height === WITHOUT_BODY) return { metrics: null, height, head: 0 }
  const head = headHeight(target)
  return { metrics: rowMetrics(height, head, tick), height, head }
}

export function observeBody(target: MessTarget, onChange: () => void): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  const body = target.renderRoot.querySelector('.koerper')
  if (!body) return null
  const observers = new ResizeObserver(onChange)
  observers.observe(body)
  return observers
}
