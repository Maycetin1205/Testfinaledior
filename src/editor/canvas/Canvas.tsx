import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { ROOT_FLOW } from '../../core/block/flow'
import { gridAreaStyle } from '../../core/block/grid'
import { useEditor } from '../state/useEditor'
import { NodeList } from './NodeList'
import { isNewBlockDrag } from './dnd'
import { commitDrop, DndContext, sameTarget, type DndState, type DropTarget } from './dndState'
import { gridTarget } from './gridDnd'
import { areaUnderPointer } from './gridArea'
import { PopupPage } from './PopupPage'

export function Canvas() {
  const ed = useEditor()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, rememberDropTarget] = useState<DropTarget | null>(null)

  const setDropTarget = useCallback((target: DropTarget | null) => {
    rememberDropTarget((before) => (sameTarget(before, target) ? before : target))
  }, [])

  const dnd = useMemo<DndState>(() => ({
    dragId,
    dropTarget,
    setDragId,
    setDropTarget,
    reset: () => {
      setDragId(null)
      setDropTarget(null)
    },
  }), [dragId, dropTarget, setDropTarget])

  const mainPage = ed.pages.find((p) => p.id === ed.activePageId)?.isMainPage ?? true

  const onGridDragOver = (e: DragEvent) => {
    if (!mainPage || (dragId === null && !isNewBlockDrag(e.dataTransfer))) return
    const target = areaUnderPointer(ed.tree, ed.rootId, e.clientX, e.clientY)
    if (!target) return setDropTarget(null)
    e.preventDefault()
    setDropTarget(gridTarget(e, ed, dnd, target.parentId, target.area))
  }

  return (
    <DndContext.Provider value={dnd}>
      <div className="flex h-full w-full flex-col">
        <div
          data-ff-canvas
          onClick={() => ed.selectBlock(null)}

          className="relative min-h-0 w-full flex-1 overflow-hidden rounded border border-line"

          style={{
            minHeight: 400,
            background: 'var(--se-bg)',
            fontFamily: 'var(--se-font)',
            fontSize: 'var(--se-fs)',
            lineHeight: 'var(--se-lh)',
            color: 'var(--se-ink)',
          }}
        >
          <div
            data-ff-root-area

            className="h-full min-h-0 overflow-auto"
            style={{
              ...gridAreaStyle(),
              padding: ROOT_FLOW.padding,
              boxSizing: 'border-box',
              background: 'var(--se-bg)',
            }}
            onDragOver={onGridDragOver}
            onDrop={(e) => {
              e.preventDefault()
              commitDrop(e, ed, dnd)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDropTarget(null)
              }
            }}
          >
            {mainPage && <NodeList parentId={ed.rootId} direction="column" grid />}
          </div>

          {!mainPage && <PopupPage popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}
