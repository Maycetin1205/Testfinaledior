import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { gridAreaStyle } from '../../core/block/grid'
import { useEditor } from '../state/useEditor'
import { NodeList } from './NodeList'
import { isNewBlockDrag } from './dnd'
import { commitDrop, DndContext, sameTarget, type DndState, type DragOffset, type DropTarget } from './dndState'
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

  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null)

  const dnd = useMemo<DndState>(() => ({
    dragId,
    dropTarget,
    dragOffset,
    setDragId,
    setDropTarget,
    setDragOffset,
    reset: () => {
      setDragId(null)
      setDropTarget(null)
      setDragOffset(null)
    },
  }), [dragId, dropTarget, dragOffset, setDropTarget])

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

          // The window of the mask: the white sheet to its edges, as the
          // export draws it (exportMask.ts). The canvas ground shows only
          // below a mask shorter than the canvas.
          style={{
            minHeight: 400,
            boxSizing: 'border-box',
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

          {mainPage && ed.blockCount === 0 && dropTarget === null && <EmptyCanvas />}
          {!mainPage && <PopupPage popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}

// What an empty mask asks for, in the middle of the sheet; it gives way to
// the cells of a block being dragged in and lets the drop through.
function EmptyCanvas() {
  return (
    <div
      data-ff-editor-helper
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-center text-ui text-muted"
    >
      <p className="text-title font-bold text-ink">Die Maske ist leer</p>
      <p>Einen Baustein im Streifen links anklicken oder hierher ziehen.</p>
      <p>Oder eine gespeicherte Maske mit „Laden“ öffnen, etwa aus dem Ordner „masken“.</p>
    </div>
  )
}
