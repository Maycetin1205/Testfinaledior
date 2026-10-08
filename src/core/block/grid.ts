import { numberProperty, type Property, type PropertyValue } from './property'
import { styleAsCss } from './styleCss'

export const GRID = { columns: 48, rowPx: 12, gapPx: 4 } as const

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
  // A block one input line high keeps its start height; only its width is pulled.
  heightFixed: boolean
  // A block as high as its content, like a text: it reports its height, the
  // editor sets the rows; only its width is pulled.
  heightFromContent: boolean
  // A list on the page grows with the window in height.
  grows: boolean
}

const GRID_FALLBACK: GridMetrics = {
  startWidth: 12,
  startHeight: 3,
  minWidth: 2,
  minHeight: 1,
  heightFixed: false,
  heightFromContent: false,
  grows: false,
}

// The rows a content of this height takes: rows of rowPx with a gap between.
export function rowsForHeight(px: number): number {
  return Math.max(1, Math.ceil((px + GRID.gapPx) / (GRID.rowPx + GRID.gapPx)))
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
