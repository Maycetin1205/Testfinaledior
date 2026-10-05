import { createContext, useContext, type DragEvent } from 'react'
import { blockType } from '../../core/block/registry'
import type { useEditor } from '../state/useEditor'
import { isNewBlockDrag, NEW_BLOCK_MIME } from './dnd'

// The cells a dragged block would take.
interface DropTarget {
  parentId: string
  x: number
  y: number
  w: number
  h: number
}

interface DndState {
  dragId: string | null
  dropTarget: DropTarget | null
  setDragId: (id: string | null) => void
  setDropTarget: (t: DropTarget | null) => void
  reset: () => void
}

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.parentId === b.parentId
    && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
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
  if (target) {
    if (dnd.dragId !== null) {
      ed.moveNodeToCell(dnd.dragId, target.parentId, target.x, target.y)
    } else if (isNewBlockDrag(e.dataTransfer)) {
      const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
      if (blockType(type)) ed.addBlockAtCell(type, target.parentId, target.x, target.y)
    }
  }
  dnd.reset()
}

export type { DndState, DropTarget }
export { commitDrop, DndContext, sameTarget, useDnd }
