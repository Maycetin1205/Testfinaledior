import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { gridAreaStyle } from '../../core/block/grid'
import { freeRowOn } from '../../core/block/gridArea'
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
  const maskRows = mainPage ? freeRowOn(ed.tree, ed.rootId) : 0

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

          // The window of the mask. The paper lies only as far as the mask
          // reaches, on the ground of the editor (user, 14.10.); a block can
          // be dropped on the ground below it as well.
          style={{
            minHeight: 400,
            boxSizing: 'border-box',
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
            {maskRows > 0 && <Paper rows={maskRows} />}
            {mainPage && <NodeList parentId={ed.rootId} />}
          </div>

          {mainPage && ed.blockCount === 0 && dropTarget === null && <EmptyCanvas />}
          {!mainPage && <PopupPage popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}

// The paper of the mask under its blocks: over all columns and down to its
// last row, with the room of the sheet around them, as the export draws it.
function Paper({ rows }: { rows: number }) {
  return (
    <div
      aria-hidden
      data-ff-editor-helper
      style={{
        gridColumn: '1 / -1',
        gridRow: `1 / span ${rows}`,
        margin: 'calc(-1 * var(--se-sheet-top)) calc(-1 * var(--se-sheet-x)) calc(-1 * var(--se-sheet-bottom))',
        background: 'var(--se-bg)',
        pointerEvents: 'none',
      }}
    />
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
      <p>Oder eine gespeicherte Maske unter „Masken“ öffnen, etwa aus dem Ordner „masken“.</p>
    </div>
  )
}
