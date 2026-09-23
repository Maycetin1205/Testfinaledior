import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { GRID, gridSlotRead, gridMetricsOf } from '../../core/block/grid'
import { freeRowOn } from '../../core/block/gridArea'
import type { EditorStore } from '../state/EditorStore'
import { areaOf, heightInBox, capacityOf, rowsCapacity } from './gridArea'
import { dragSize } from './dragSize'

export function useBlockResize(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  rootRef: RefObject<HTMLElement | null>,
) {
  function startRasterResize(e: ReactPointerEvent<HTMLDivElement>, axis: 'x' | 'y') {
    const el = rootRef.current
    if (!el) return
    const node = blockRef.current
    const pos = gridSlotRead(node.values)
    const spec = gridMetricsOf(blockType(node.type))
    const rect = el.getBoundingClientRect()
    if (axis === 'x') {
      dragSize(editor, e, {
        axis: 'x',
        prop: 'gridW',
        getId: () => blockRef.current.id,
        start: pos.w,
        min: Math.max(1, spec.minWidth),
        step: (rect.width + GRID.gapPx) / pos.w,

        apply: (id, value) => editor.resizeNodeToCells(id, 'x', value),
      })
    } else {
      const area = el.parentElement ? areaOf(el.parentElement) : null
      const capacity = area && node.parentId
        ? rowsCapacity(editor.tree, node.parentId, area)
        : null
      const own = capacityOf(editor.tree, node.id)
      const content = own === null ? 0 : freeRowOn(editor.tree, node.id) + pos.h - own
      dragSize(editor, e, {
        axis: 'y',
        prop: 'gridH',
        getId: () => blockRef.current.id,
        start: pos.h,
        min: Math.max(1, spec.minHeight, content),
        step: (rect.height + GRID.gapPx) / pos.h,

        apply: (id, value) => {
          editor.resizeNodeToCells(id, 'y', heightInBox(capacity, pos.y, value))
        },
      })
    }
  }

  return { startRasterResize }
}
