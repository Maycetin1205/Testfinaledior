import { numberProperty, type Property, type PropertyValue } from './property'
import { styleAsCss } from './styleCss'

export const GRID = { columns: 48, columnPx: 20, rowPx: 12, gapPx: 4 } as const

export interface GridSlot {
  x: number
  y: number
  w: number
  h: number
}

export interface GridMetrics {
  startWidth: number
  startHeight: number
  minWidth: number
  minHeight: number
  widthDraggable: boolean
  // A list on the page grows with the window in height.
  grows: boolean
}

const GRID_FALLBACK: GridMetrics = {
  startWidth: 12,
  startHeight: 3,
  minWidth: 2,
  minHeight: 1,
  widthDraggable: true,
  grows: false,
}

const cell = (label: string, fallback: number): Property<number> => numberProperty({
  default: fallback, label, place: 'none', min: 0,
})

// The four grid properties every block carries. The canvas writes them; they
// leave as inline grid styles, not as attributes.
export const GRID_PROPERTIES = {
  gridX: cell('Spalte', 0),
  gridY: cell('Zeile', 0),
  gridW: cell('Spalten breit', GRID.columns),
  gridH: cell('Zeilen hoch', 1),
}

function parseGridCell(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return fallback
}

export function gridSlotRead(props: Readonly<Record<string, PropertyValue>>): GridSlot {
  return {
    x: parseGridCell(props.gridX, 0),
    y: parseGridCell(props.gridY, 0),
    w: Math.max(1, parseGridCell(props.gridW, GRID.columns)),
    h: Math.max(1, parseGridCell(props.gridH, 1)),
  }
}

export function gridMetricsOf(
  def: { grid?: Partial<GridMetrics> } | undefined,
): GridMetrics {
  return { ...GRID_FALLBACK, ...(def?.grid ?? {}) }
}

// The number of columns of an area inside the mask, as wide as it stands on
// the grid of the page: its blocks keep the page's columns.
export const AREA_COLUMNS = '--area-columns'

export function gridAreaStyle(columns: number | string = GRID.columns): Record<string, string | number> {
  return {
    display: 'grid',

    gridTemplateColumns: `repeat(${columns}, 1fr)`,

    gridAutoRows: `${GRID.rowPx}px`,
    gap: `${GRID.gapPx}px`,

    alignContent: 'start',
  }
}

export function gridAreaCss(columns: number | string = GRID.columns): string {
  return styleAsCss(gridAreaStyle(columns))
}

export function gridSlotStyle(pos: GridSlot): Record<string, string | number> {
  return {
    gridColumn: `${pos.x + 1} / span ${pos.w}`,
    gridRow: `${pos.y + 1} / span ${pos.h}`,
    minWidth: 0,
    minHeight: 0,
  }
}

const GROW_ROW = 'minmax(0, 1fr)'

// The rows of the page: a row that only growing blocks cover shares the
// height the window has left, every other row stays one fixed step. Null
// when nothing grows.
export function growRowsTemplate(
  slots: readonly { slot: GridSlot; grows: boolean }[],
): string | null {
  const rows = nextFreeRow(slots.map((s) => s.slot))
  const grows = Array.from({ length: rows }, () => false)
  const fixed = Array.from({ length: rows }, () => false)
  for (const { slot, grows: g } of slots) {
    for (let r = slot.y; r < slot.y + slot.h; r++) (g ? grows : fixed)[r] = true
  }
  const tracks = grows.map((g, r) => (g && !fixed[r] ? GROW_ROW : `${GRID.rowPx}px`))
  if (!tracks.includes(GROW_ROW)) return null
  const runs: string[] = []
  for (let r = 0; r < tracks.length;) {
    let n = 1
    while (r + n < tracks.length && tracks[r + n] === tracks[r]) n++
    runs.push(n === 1 ? tracks[r] : `repeat(${n}, ${tracks[r]})`)
    r += n
  }
  return runs.join(' ')
}

// How short a growing block may get in a small window: its least rows, never
// more than drawn.
export function growMinHeightPx(minRows: number, drawnRows: number): number {
  const rows = Math.max(1, Math.min(minRows, drawnRows))
  return rows * GRID.rowPx + (rows - 1) * GRID.gapPx
}

export function nextFreeRow(positions: readonly GridSlot[]): number {
  return positions.reduce((max, p) => Math.max(max, p.y + p.h), 0)
}

export const slotsOverlap = (a: GridSlot, b: GridSlot): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const liesFree = (taken: readonly GridSlot[], slot: GridSlot): boolean =>
  taken.every((other) => !slotsOverlap(slot, other))

// 0, 1, -1, 2, -2 … within [low, high].
function* outward(from: number, low: number, high: number): Generator<number> {
  const at = Math.max(low, Math.min(from, high))
  yield at
  for (let d = 1; at - d >= low || at + d <= high; d++) {
    if (at + d <= high) yield at + d
    if (at - d >= low) yield at - d
  }
}

// A block never lies on another: the free place of this size nearest to the
// wanted one, measured as the block moves on the screen, a column being wider
// than a row is high. Null only when the rows are bounded and no row has room.
export function nearestFreeSlot(
  taken: readonly GridSlot[],
  wanted: GridSlot,
  columns: number,
  rows: number | null,
): GridSlot | null {
  const w = Math.max(1, Math.min(wanted.w, columns))
  const h = Math.max(1, wanted.h)
  const lastRow = rows === null ? Math.max(nextFreeRow(taken), wanted.y) : rows - h
  const columnStep = GRID.columnPx + GRID.gapPx
  const rowStep = GRID.rowPx + GRID.gapPx
  let best: GridSlot | null = null
  let bestWay = Infinity
  for (const y of outward(wanted.y, 0, lastRow)) {
    if (Math.abs(y - wanted.y) * rowStep >= bestWay) break
    for (const x of outward(wanted.x, 0, columns - w)) {
      const way = Math.abs(x - wanted.x) * columnStep + Math.abs(y - wanted.y) * rowStep
      if (way >= bestWay) break
      const slot = { x, y, w, h }
      if (liesFree(taken, slot)) {
        best = slot
        bestWay = way
      }
    }
  }
  return best
}

// A slot pulled from its start: the pulled sides give way until it lies on
// no other, down to the least size; where even that lies on one, it stays as
// it was.
export function fitSlot(
  taken: readonly GridSlot[],
  start: GridSlot,
  pulled: GridSlot,
  least: { w: number; h: number },
): GridSlot {
  const east = pulled.x + pulled.w > start.x + start.w
  const west = pulled.x < start.x
  const south = pulled.y + pulled.h > start.y + start.h
  const north = pulled.y < start.y
  let slot = pulled
  while (!liesFree(taken, slot)) {
    let next = slot
    if (east && next.w > least.w) next = { ...next, w: next.w - 1 }
    else if (west && next.w > least.w) next = { ...next, x: next.x + 1, w: next.w - 1 }
    if (south && next.h > least.h) next = { ...next, h: next.h - 1 }
    else if (north && next.h > least.h) next = { ...next, y: next.y + 1, h: next.h - 1 }
    if (next === slot) return start
    slot = next
  }
  return slot
}

export function firstGap(
  taken: readonly GridSlot[],
  w: number,
  h: number,
  rows: number | null,
  columns: number = GRID.columns,
): { x: number; y: number } | null {
  if (rows === null) return { x: 0, y: nextFreeRow(taken) }
  const free = (x: number, y: number) => taken.every((p) =>
    x + w <= p.x || p.x + p.w <= x || y + h <= p.y || p.y + p.h <= y)
  for (let y = 0; y + h <= rows; y++) {
    for (let x = 0; x + w <= columns; x++) {
      if (free(x, y)) return { x, y }
    }
  }
  return null
}
