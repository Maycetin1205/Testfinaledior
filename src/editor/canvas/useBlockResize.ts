import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { GRID, gridSlotRead, gridMetricsOf, type GridSlot } from '../../core/block/grid'
import { freeRowOn } from '../../core/block/gridArea'
import type { EditorStore } from '../state/EditorStore'
import { areaOf, heightInBox, capacityOf, rowsCapacity } from './gridArea'
import { swallowNextClick } from './dragPosition'

// The edge or corner a size is pulled at, by compass point.
export type Edge = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw'

// The edges before the corners, so a corner lies on top where both meet.
export const GRIPS: readonly Edge[] = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(value, Math.max(low, high)))

export function useBlockResize(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  rootRef: RefObject<HTMLElement | null>,
) {
  // The pulled edges follow the pointer cell by cell, the opposite ones stay.
  function startGridResize(e: ReactPointerEvent<HTMLElement>, edge: Edge) {
    const el = rootRef.current
    if (!el) return
    e.preventDefault()
    e.stopPropagation()

    const node = blockRef.current
    const start = gridSlotRead(node.values)
    const spec = gridMetricsOf(blockType(node.type))
    const rect = el.getBoundingClientRect()
    const stepX = (rect.width + GRID.gapPx) / start.w
    const stepY = (rect.height + GRID.gapPx) / start.h

    const area = el.parentElement ? areaOf(el.parentElement) : null
    const capacity = area && node.parentId
      ? rowsCapacity(editor.tree, node.parentId, area)
      : null
    // A container keeps room for what it holds.
    const own = capacityOf(editor.tree, node.id)
    const content = own === null ? 0 : freeRowOn(editor.tree, node.id) + start.h - own
    const minW = Math.max(1, spec.minWidth)
    const minH = Math.max(1, spec.minHeight, content)

    const slotAt = (dx: number, dy: number): GridSlot => {
      let { x, y, w, h } = start
      if (edge.includes('e')) w = clamp(start.w + dx, minW, GRID.columns - start.x)
      if (edge.includes('w')) {
        x = clamp(start.x + dx, 0, start.x + start.w - minW)
        w = start.w + start.x - x
      }
      if (edge.includes('s')) h = heightInBox(capacity, start.y, Math.max(minH, start.h + dy))
      if (edge.includes('n')) {
        y = clamp(start.y + dy, 0, start.y + start.h - minH)
        h = start.h + start.y - y
      }
      return { x, y, w, h }
    }

    const bracket = editor.openGesture()
    let last = start
    const onMove = (ev: PointerEvent) => {
      const next = slotAt(
        Math.round((ev.clientX - e.clientX) / stepX),
        Math.round((ev.clientY - e.clientY) / stepY),
      )
      if (next.x === last.x && next.y === last.y && next.w === last.w && next.h === last.h) return
      last = next
      bracket.open()
      editor.resizeNodeToSlot(blockRef.current.id, next)
    }
    const finish = () => {
      bracket.close()
      if (last !== start) swallowNextClick()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('blur', finish)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', finish)
  }

  // A double click on a grip gives back the start size along that grip.
  function resetGridSize(edge: Edge) {
    const node = blockRef.current
    const slot = gridSlotRead(node.values)
    const spec = gridMetricsOf(blockType(node.type))
    editor.resizeNodeToSlot(node.id, {
      ...slot,
      ...(edge.includes('e') || edge.includes('w') ? { w: spec.startWidth } : {}),
      ...(edge.includes('n') || edge.includes('s') ? { h: spec.startHeight } : {}),
    })
  }

  return { startGridResize, resetGridSize }
}
