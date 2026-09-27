import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { GRID, gridSlotRead } from '../../core/block/grid'
import { mayContain } from '../../core/block/registry'
import type { EditorStore } from '../state/EditorStore'
import type { DndState } from './dndState'
import { cellFromPointer } from './gridDnd'
import {
  areaUnderPointer,
  areaOf,
  rowsCapacity,
  rowInBox,
  type AreasHit,
} from './gridArea'

const DRAG_THRESHOLD = 4

function swallowClick(ev: MouseEvent): void {
  ev.stopPropagation()
  ev.preventDefault()
}

// The click that ends a drag is no click on what lies under the pointer.
export function swallowNextClick(): void {
  window.addEventListener('click', swallowClick, { capture: true, once: true })
  setTimeout(() => {
    window.removeEventListener('click', swallowClick, { capture: true })
  }, 0)
}

function inTextEditing(e: ReactPointerEvent<HTMLElement>): boolean {
  for (const t of e.nativeEvent.composedPath()) {
    if (t === e.currentTarget) return false
    if (t instanceof HTMLElement && t.isContentEditable) return true
  }
  return false
}

export function dragPosition(
  editor: EditorStore,
  dnd: DndState,
  e: ReactPointerEvent<HTMLElement>,
  node: BlockNode,
  parentId: string,
): void {
  if (e.button !== 0) return
  if (inTextEditing(e)) return
  const wrapper = e.currentTarget

  const gridEl = areaOf(wrapper)
  if (!gridEl) return

  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const rect = wrapper.getBoundingClientRect()

  const grab = { x: startX - rect.left, y: startY - rect.top }
  const pos = gridSlotRead(node.values)
  const id = node.id
  const own: AreasHit = { parentId, area: gridEl }
  let active = false
  let last: { target: AreasHit; x: number; y: number } | null = null

  const targetArea = (x: number, y: number): AreasHit => {
    const hit = areaUnderPointer(editor.tree, editor.rootId, x, y)
    if (!hit || hit.parentId === parentId) return own
    const target = editor.getNode(hit.parentId)
    if (!target || !mayContain(target.type, node.type) || editor.isInSubtree(id, hit.parentId)) {
      return own
    }
    return hit
  }

  const cleanUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('blur', onCancel)

    window.removeEventListener('click', swallowClick, { capture: true })
  }

  const onMove = (ev: PointerEvent): void => {
    if (!active) {
      if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return
      active = true
      dnd.setDragId(id)
    }
    const target = targetArea(ev.clientX, ev.clientY)
    const cell = cellFromPointer(target.area, ev.clientX - grab.x, ev.clientY - grab.y)
    const x = Math.max(0, Math.min(cell.x, GRID.columns - pos.w))
    const capacity = rowsCapacity(editor.tree, target.parentId, target.area)
    const y = rowInBox(capacity, cell.y, pos.h)
    last = { target, x, y }
    dnd.setDropTarget({ kind: 'grid', parentId: target.parentId, x, y, w: pos.w, h: pos.h })
  }

  const onUp = (): void => {
    cleanUp()
    if (active && last) {
      editor.moveNodeToCell(id, last.target.parentId, last.x, last.y)
      swallowNextClick()
    }
    dnd.reset()
  }

  const onCancel = (): void => {
    cleanUp()
    dnd.reset()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)

  window.addEventListener('blur', onCancel)
}
