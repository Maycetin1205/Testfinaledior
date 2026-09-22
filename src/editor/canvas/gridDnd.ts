import type { DragEvent } from 'react'
import { mayContain, blockType } from '../../core/block/registry'
import { GRID, gridMetricsOf } from '../../core/block/grid'
import type { useEditor } from '../state/useEditor'
import { newBlockDragType } from './dnd'
import type { DndState, DropTarget } from './dndState'
import { rowsCapacity, rowInBox } from './gridArea'

export function cellFromPointer(
  gridEl: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const style = getComputedStyle(gridEl)
  const rect = gridEl.getBoundingClientRect()
  const padL = parseFloat(style.paddingLeft) || 0
  const padT = parseFloat(style.paddingTop) || 0
  const columnsGap = parseFloat(style.columnGap) || GRID.gapPx
  const rowsGap = parseFloat(style.rowGap) || GRID.gapPx

  const lx = clientX - rect.left - padL + gridEl.scrollLeft
  const ly = clientY - rect.top - padT + gridEl.scrollTop

  const columns = style.gridTemplateColumns
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let x = 0
  let xkante = 0
  while (x < columns.length) {
    if (lx < xkante + columns[x]) break
    xkante += columns[x] + columnsGap
    x++
  }
  x = Math.max(0, Math.min(GRID.columns - 1, x))

  const tracks = style.gridTemplateRows
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let y = 0
  let edge = 0
  while (y < tracks.length) {
    if (ly < edge + tracks[y]) break
    edge += tracks[y] + rowsGap
    y++
  }
  if (y >= tracks.length) {
    const pitch = GRID.rowPx + rowsGap
    y = tracks.length + (pitch > 0 ? Math.max(0, Math.floor((ly - edge) / pitch)) : 0)
  }
  return { x, y: Math.max(0, y) }
}

function draggedSize(
  ed: ReturnType<typeof useEditor>,
  dnd: DndState,
  dt: DataTransfer,
  parentId: string,
): { w: number; h: number } | null {
  const parent = ed.getNode(parentId)
  if (!parent) return null
  if (dnd.dragId !== null) {
    const node = ed.getNode(dnd.dragId)
    if (!node || !mayContain(parent.type, node.type)) return null
    const spec = gridMetricsOf(blockType(node.type))
    return { w: spec.startWidth, h: spec.startHeight }
  }
  const type = newBlockDragType(dt)
  const def = type ? blockType(type) : undefined
  if (!type || !def || !mayContain(parent.type, type)) return null
  const spec = gridMetricsOf(def)
  return { w: spec.startWidth, h: spec.startHeight }
}

export function rasterTarget(
  e: DragEvent,
  ed: ReturnType<typeof useEditor>,
  dnd: DndState,
  parentId: string,
  gridEl: HTMLElement,
): Extract<DropTarget, { kind: 'grid' }> | null {
  const size = draggedSize(ed, dnd, e.dataTransfer, parentId)
  if (!size) return null
  const cell = cellFromPointer(gridEl, e.clientX, e.clientY)
  const x = Math.max(0, Math.min(cell.x, GRID.columns - size.w))
  const capacity = rowsCapacity(ed.tree, parentId, gridEl)
  const y = rowInBox(capacity, cell.y, size.h)
  return { kind: 'grid', parentId, x, y, w: size.w, h: size.h }
}
