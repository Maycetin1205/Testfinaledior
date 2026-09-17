// Die Leinwand: die Maskenflaeche im Editor mit ihren Seiten.
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { WURZEL_FLUSS } from '../../kern/maske/fluss'
import { rasterFlaecheStil } from '../../kern/maske/raster'
import { useEditor } from '../zustand/useEditor'
import { NodeList } from './CanvasNode'
import { LeerHinweis } from './LeerHinweis'
import { isNewBlockDrag } from './dnd'
import { commitDrop, DndContext, gleichesZiel, type DndState, type DropTarget } from './dndState'
import { rasterZiel } from './rasterDnd'
import { flaecheUnterZeiger } from './rasterFlaeche'
import { PopupSeite } from './PopupSeite'

export function Canvas() {
  const ed = useEditor()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, merkeDropTarget] = useState<DropTarget | null>(null)

  const setDropTarget = useCallback((ziel: DropTarget | null) => {
    merkeDropTarget((vorher) => (gleichesZiel(vorher, ziel) ? vorher : ziel))
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

  const hauptseite = ed.pages.find((p) => p.id === ed.activePageId)?.istHauptseite ?? true

  const onGridDragOver = (e: DragEvent) => {
    if (!hauptseite || (dragId === null && !isNewBlockDrag(e.dataTransfer))) return
    const ziel = flaecheUnterZeiger(ed.tree, ed.rootId, e.clientX, e.clientY)
    if (!ziel) return setDropTarget(null)
    e.preventDefault()
    setDropTarget(rasterZiel(e, ed, dnd, ziel.parentId, ziel.flaeche))
  }

  return (
    <DndContext.Provider value={dnd}>
      <div className="flex h-full w-full flex-col">
        <div
          onClick={() => ed.selectBlock(null)}

          className="relative min-h-0 w-full flex-1 overflow-hidden rounded border border-linie"

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
            data-ff-wurzelflaeche

            className="h-full min-h-0 overflow-auto"
            style={{
              ...rasterFlaecheStil(),
              padding: WURZEL_FLUSS.padding,
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
            {hauptseite && <NodeList parentId={ed.rootId} direction="column" raster />}
          </div>

          {hauptseite && ed.childNodesOf(ed.rootId).length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <LeerHinweis titel="Leere Maske" />
            </div>
          )}
          {!hauptseite && <PopupSeite popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}

export type { DropTarget }
export { DndContext }
