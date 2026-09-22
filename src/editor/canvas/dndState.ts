import { createContext, useContext, type DragEvent } from 'react'
import { blockType } from '../../core/block/registry'
import type { useEditor } from '../state/useEditor'
import { isNewBlockDrag, NEW_BLOCK_MIME } from './dnd'

type DropTarget =
  | { kind: 'flow'; parentId: string; index: number }
  | { kind: 'grid'; parentId: string; x: number; y: number; w: number; h: number }

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
  if (a.kind === 'grid' && b.kind === 'grid') {
    return a.parentId === b.parentId
      && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
  }
  if (a.kind === 'flow' && b.kind === 'flow') {
    return a.parentId === b.parentId && a.index === b.index
  }
  return false
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
  if (target?.kind === 'grid') {
    if (dnd.dragId !== null) {
      ed.moveNodeToCell(dnd.dragId, target.parentId, target.x, target.y)
    } else if (isNewBlockDrag(e.dataTransfer)) {
      const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
      if (blockType(type)) ed.addBlockAtCell(type, target.parentId, target.x, target.y)
    }
  } else if (target) {
    if (dnd.dragId !== null) {
      ed.moveNode(dnd.dragId, target.parentId, target.index)
      ed.selectBlock(dnd.dragId)
    } else if (isNewBlockDrag(e.dataTransfer)) {
      const type = e.dataTransfer.getData(NEW_BLOCK_MIME)
      if (blockType(type)) ed.addBlock(type, target.parentId, target.index)
    }
  }
  dnd.reset()
}

export type { DndState, DropTarget }
export { commitDrop, DndContext, sameTarget, useDnd }
