import { useCallback, useMemo, useState, type DragEvent } from 'react'
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
          onClick={() => {
            if (ed.followPickFor !== null) ed.pickFollowFor(null)
            else ed.selectBlock(null)
          }}

          className="relative min-h-0 w-full flex-1 overflow-hidden rounded border border-line"

          // The window of the mask: its ground, and on it the sheet, as the
          // export draws them (exportMask.ts).
          style={{
            minHeight: 400,
            boxSizing: 'border-box',
            padding: 'var(--se-window-room)',
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
              padding: 'var(--se-sheet-top) var(--se-sheet-x) var(--se-sheet-bottom)',
              boxSizing: 'border-box',
              background: 'var(--se-panel)',
              borderRadius: 'var(--se-radius-card)',
              boxShadow: 'var(--se-shadow-sheet)',
              fontVariantNumeric: 'tabular-nums',
              caretColor: 'var(--se-accent)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--se-scrollbar) transparent',
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
            {mainPage && <NodeList parentId={ed.rootId} />}
          </div>

          {!mainPage && <PopupPage popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}
