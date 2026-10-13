import { createContext, useContext, type DragEvent } from 'react'
import { blockType } from '../../core/block/registry'
import type { useEditor } from '../state/useEditor'
import { isNewBlockDrag, NEW_BLOCK_MIME } from './dnd'

// The cells a dragged block would take, and whether they are free.
interface DropTarget {
  parentId: string
  x: number
  y: number
  w: number
  h: number
  free: boolean
}

// How far the pointer has carried the dragged block from where it was grabbed.
interface DragOffset {
  dx: number
  dy: number
}

interface DndState {
  dragId: string | null
  dropTarget: DropTarget | null
  dragOffset: DragOffset | null
  setDragId: (id: string | null) => void
  setDropTarget: (t: DropTarget | null) => void
  setDragOffset: (o: DragOffset | null) => void
  reset: () => void
}

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.parentId === b.parentId
    && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.free === b.free
}

const DndContext = createContext<DndState | null>(null)

function useDnd(): DndState {
  const dnd = useContext(DndContext)
  if (!dnd) throw new Error('DndContext fehlt (nur innerhalb des Canvas nutzbar)')
  return dnd
}

function commitDrop(
  e: DragEvent,
  ed: ReturnType<typeof useEditor>,
  dnd: DndState,
): void {
  const target = dnd.dropTarget
  if (target && target.free) {
    if (dnd.dragId !== null) {
      ed.moveNodeToCell(dnd.dragId, target.parentId, target.x, target.y)
    } else if (isNewBlockDrag(e.dataTransfer)) {
      const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
      if (blockType(type)) ed.addBlockAtCell(type, target.parentId, target.x, target.y)
    }
  }
  dnd.reset()
}

export type { DndState, DropTarget, DragOffset }
export { commitDrop, DndContext, sameTarget, useDnd }
