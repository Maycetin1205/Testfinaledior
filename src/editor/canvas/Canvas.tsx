// Die Leinwand: die Maskenflaeche im Editor mit ihren Seiten.
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { WURZEL_ID } from '../../core/blocks/BlockData'
import { WURZEL_FLUSS } from '../../core/blocks/flowLayout'
import { randPlatzLinks } from '../../core/blocks/maskenRand'
import { rasterFlaecheStil, rasterPlatzStil } from '../../core/blocks/rasterLayout'
import { useEditor } from '../../state/useEditor'
import { NodeList } from './CanvasNode'
import { LeerHinweis } from './LeerHinweis'
import { isNewBlockDrag } from './dnd'
import { commitDrop, DndContext, gleichesZiel, type DndState, type DropTarget } from './dndState'
import { rasterZiel } from './rasterDnd'
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

  const onGridDragOver = (e: DragEvent) => {
    if (dragId === null && !isNewBlockDrag(e.dataTransfer)) return
    e.preventDefault()
    setDropTarget(rasterZiel(e, ed, dnd, ed.rootId, e.currentTarget as HTMLElement))
  }

  const aktiveSeite = ed.pages.find((p) => p.id === ed.activePageId)
  const flaeche = aktiveSeite?.istFlaeche ?? true

  const randLinks = randPlatzLinks(ed.tree)

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

            className="h-full min-h-0 overflow-auto"
            style={{
              ...rasterFlaecheStil(),
              padding: WURZEL_FLUSS.padding,
              paddingLeft: WURZEL_FLUSS.padding + randLinks,
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
            {flaeche && <NodeList parentId={ed.rootId} direction="column" raster />}

            {flaeche && ed.rootId !== WURZEL_ID && (
              <NodeList parentId={WURZEL_ID} direction="column" raster nurRand />
            )}

            {flaeche && dropTarget?.kind === 'raster' && dropTarget.parentId === ed.rootId && (
              <div
                aria-hidden
                data-ff-editor-helper
                style={{
                  ...rasterPlatzStil({
                    x: dropTarget.x,
                    y: dropTarget.y,
                    w: dropTarget.w,
                    h: dropTarget.h,
                  }),
                  pointerEvents: 'none',
                  background: 'hsl(var(--wb-auswahl) / 0.16)',
                  border: '2px dashed hsl(var(--wb-auswahl))',
                  borderRadius: 4,
                }}
              />
            )}
          </div>

          {flaeche && ed.childNodesOf(ed.rootId).length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <LeerHinweis
                titel={aktiveSeite?.istHauptseite ? 'Leere Maske' : `Leere Seite „${aktiveSeite?.name ?? ''}“`}
              />
            </div>
          )}
          {!flaeche && <PopupSeite popupId={ed.activePageId} />}
        </div>
      </div>
    </DndContext.Provider>
  )
}

export type { DropTarget }
export { DndContext }
