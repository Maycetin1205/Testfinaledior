import { numberProperty, type Property } from './property'
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
}

const GRID_FALLBACK: GridMetrics = {
  startWidth: 12,
  startHeight: 3,
  minWidth: 2,
  minHeight: 1,
  widthDraggable: true,
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

export function gridSlotRead(props: Record<string, unknown>): GridSlot {
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

export function gridAreaStyle(): Record<string, string | number> {
  return {
    display: 'grid',

    gridTemplateColumns: `repeat(${GRID.columns}, 1fr)`,

    gridAutoRows: `${GRID.rowPx}px`,
    gap: `${GRID.gapPx}px`,

    alignContent: 'start',
  }
}

export function gridAreaCss(): string {
  return styleAsCss(gridAreaStyle())
}

export function gridSlotStyle(pos: GridSlot): Record<string, string | number> {
  return {
    gridColumn: `${pos.x + 1} / span ${pos.w}`,
    gridRow: `${pos.y + 1} / span ${pos.h}`,
    minWidth: 0,
    minHeight: 0,
  }
}

export function nextFreeRow(positions: readonly GridSlot[]): number {
  return positions.reduce((max, p) => Math.max(max, p.y + p.h), 0)
}

export function firstGap(
  taken: readonly GridSlot[],
  w: number,
  h: number,
  rows: number | null,
): { x: number; y: number } | null {
  if (rows === null) return { x: 0, y: nextFreeRow(taken) }
  const free = (x: number, y: number) => taken.every((p) =>
    x + w <= p.x || p.x + p.w <= x || y + h <= p.y || p.y + p.h <= y)
  for (let y = 0; y + h <= rows; y++) {
    for (let x = 0; x + w <= GRID.columns; x++) {
      if (free(x, y)) return { x, y }
    }
  }
  return null
}
