// Ein Popup auf der Leinwand: eigene Flaeche, verschiebbarer Anker.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DIALOG_RAND, DIALOG_SCHLIESSEN_EVENT } from '../../blocks/shared/DialogRahmen'
import { bausteinArt } from '../../core/blocks/blockRegistry'
import { rasterPlatzStil } from '../../core/blocks/rasterLayout'
import { useEditor } from '../../state/useEditor'
import { BlockHost } from './BlockHost'
import { NodeList } from './CanvasNode'
import { LeerHinweis } from './LeerHinweis'
import { isNewBlockDrag } from './dnd'
import { commitDrop, useDnd } from './dndState'
import { rasterZiel } from './rasterDnd'
import { flaecheIn } from './rasterFlaeche'
import { zieheGroesse } from './zieheGroesse'

const POPUP_MIN_BREITE = 240
const POPUP_MIN_HOEHE = 160

function popupZahl(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function imRumpf(gridEl: HTMLElement, x: number, y: number): boolean {
  const r = gridEl.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

export function PopupSeite({ popupId }: { popupId: string }) {
  const ed = useEditor()
  const dnd = useDnd()

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [stage, setStage] = useState<{ b: number; h: number } | null>(null)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const beobachter = new ResizeObserver(() =>
      setStage({ b: el.clientWidth, h: el.clientHeight }))
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const zurHauptseite = (): void => { ed.setActivePage(ed.pages[0].id) }
    el.addEventListener(DIALOG_SCHLIESSEN_EVENT, zurHauptseite)
    return () => el.removeEventListener(DIALOG_SCHLIESSEN_EVENT, zurHauptseite)
  }, [ed])
  const node = ed.getNode(popupId)
  if (!node) return null
  const selected = ed.selectedId === node.id
  const breite = popupZahl(node.props.breite, 520)
  const hoehe = popupZahl(node.props.hoehe, 380)

  const sichtbareBreite = stage ? Math.min(breite, Math.max(40, stage.b - DIALOG_RAND)) : breite
  const sichtbareHoehe = stage ? Math.min(hoehe, Math.max(40, stage.h - DIALOG_RAND)) : hoehe

  const startResize = (
    e: ReactPointerEvent<HTMLDivElement>,
    prop: 'breite' | 'hoehe',
    start: number,
    min: number,
  ) => {
    zieheGroesse(ed, e, {
      achse: prop === 'breite' ? 'x' : 'y',
      prop,
      getId: () => node.id,
      start,
      min,
      faktor: 2,
    })
  }

  const def = bausteinArt(node.type)
  const standard = def?.defaultProps ?? {}

  const rumpf = (): HTMLElement | null =>
    flaecheIn(def ? wrapRef.current?.querySelector(def.tagName) : null)
  const geist = dnd.dropTarget?.kind === 'raster' && dnd.dropTarget.parentId === node.id
    ? dnd.dropTarget
    : null

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onDragOver={(e) => {
        if (dnd.dragId === null && !isNewBlockDrag(e.dataTransfer)) return
        const gridEl = rumpf()
        if (!gridEl || !imRumpf(gridEl, e.clientX, e.clientY)) {
          dnd.setDropTarget(null)
          return
        }
        e.preventDefault()
        dnd.setDropTarget(rasterZiel(e, ed, dnd, node.id, gridEl))
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          dnd.setDropTarget(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        commitDrop(e, ed, dnd)
      }}
    >
      <BlockHost
        block={node}
        selected={selected}
        onSelect={() => ed.selectBlock(node.id)}
      >
        <NodeList parentId={node.id} direction="column" raster />

        {geist && (
          <div
            aria-hidden
            data-ff-editor-helper
            style={{
              ...rasterPlatzStil(geist),
              pointerEvents: 'none',
              background: 'hsl(var(--wb-auswahl) / 0.16)',
              border: '2px dashed hsl(var(--wb-auswahl))',
              borderRadius: 4,
            }}
          />
        )}
      </BlockHost>

      {ed.childNodesOf(node.id).length === 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <LeerHinweis titel={`Leeres Fenster „${String(node.props.name ?? '')}“`} />
        </div>
      )}
      {selected && (
        <>
          <div
            draggable={false}
            data-ff-editor-helper
            onPointerDown={(e) => startResize(e, 'breite', sichtbareBreite, POPUP_MIN_BREITE)}
            onDragStart={(e) => e.preventDefault()}
            onDoubleClick={(e) => {
              e.stopPropagation()
              ed.updateProperty(node.id, 'breite', standard.breite ?? 520)
            }}
            title="Breite ziehen · Doppelklick: Standard"
            style={{
              position: 'absolute',
              left: `calc(50% + ${sichtbareBreite / 2}px - 3px)`,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 7,
              height: 26,
              borderRadius: 4,
              background: 'hsl(var(--wb-auswahl))',
              cursor: 'ew-resize',
              zIndex: 20,
            }}
          />
          <div
            draggable={false}
            data-ff-editor-helper
            onPointerDown={(e) => startResize(e, 'hoehe', sichtbareHoehe, POPUP_MIN_HOEHE)}
            onDragStart={(e) => e.preventDefault()}
            onDoubleClick={(e) => {
              e.stopPropagation()
              ed.updateProperty(node.id, 'hoehe', standard.hoehe ?? 380)
            }}
            title="Höhe ziehen · Doppelklick: Standard"
            style={{
              position: 'absolute',
              left: '50%',
              top: `calc(50% + ${sichtbareHoehe / 2}px - 3px)`,
              transform: 'translateX(-50%)',
              width: 26,
              height: 7,
              borderRadius: 4,
              background: 'hsl(var(--wb-auswahl))',
              cursor: 'ns-resize',
              zIndex: 20,
            }}
          />
        </>
      )}
    </div>
  )
}
