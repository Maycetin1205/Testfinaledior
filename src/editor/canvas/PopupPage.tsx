import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DIALOG_EDGE, DIALOG_CLOSE_EVENT } from '../../blocks/behavior/DialogFrame'
import { blockType } from '../../core/block/registry'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { NodeList } from './CanvasNode'
import { isNewBlockDrag } from './dnd'
import { commitDrop, useDnd } from './dndState'
import { gridTarget } from './gridDnd'
import { areaUnderPointer } from './gridArea'
import { dragSize } from './dragSize'

const POPUP_MIN_WIDTH = 240
const POPUP_MIN_HEIGHT = 160

function popupNumber(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function PopupPage({ popupId }: { popupId: string }) {
  const ed = useEditor()
  const dnd = useDnd()

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [stage, setStage] = useState<{ b: number; h: number } | null>(null)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observers = new ResizeObserver(() =>
      setStage({ b: el.clientWidth, h: el.clientHeight }))
    observers.observe(el)
    return () => observers.disconnect()
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const toMainPage = (): void => { ed.setActivePage(ed.pages[0].id) }
    el.addEventListener(DIALOG_CLOSE_EVENT, toMainPage)
    return () => el.removeEventListener(DIALOG_CLOSE_EVENT, toMainPage)
  }, [ed])
  const node = ed.getNode(popupId)
  if (!node) return null
  const selected = ed.selectedId === node.id
  const width = popupNumber(node.values.popupWidth, 520)
  const height = popupNumber(node.values.popupHeight, 380)

  const visibleWidth = stage ? Math.min(width, Math.max(40, stage.b - DIALOG_EDGE)) : width
  const visibleHeight = stage ? Math.min(height, Math.max(40, stage.h - DIALOG_EDGE)) : height

  const startResize = (
    e: ReactPointerEvent<HTMLDivElement>,
    prop: 'popupWidth' | 'popupHeight',
    start: number,
    min: number,
  ) => {
    dragSize(ed, e, {
      axis: prop === 'popupWidth' ? 'x' : 'y',
      prop,
      getId: () => node.id,
      start,
      min,
      factor: 2,
    })
  }

  const def = blockType(node.type)
  const declared = def?.properties ?? {}

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onDragOver={(e) => {
        if (dnd.dragId === null && !isNewBlockDrag(e.dataTransfer)) return
        const target = areaUnderPointer(ed.tree, node.id, e.clientX, e.clientY)
        if (!target) {
          dnd.setDropTarget(null)
          return
        }
        e.preventDefault()
        dnd.setDropTarget(gridTarget(e, ed, dnd, target.parentId, target.area))
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
        <NodeList parentId={node.id} direction="column" grid />
      </BlockHost>

      {selected && (
        <>
          <div
            draggable={false}
            data-ff-editor-helper
            onPointerDown={(e) => startResize(e, 'popupWidth', visibleWidth, POPUP_MIN_WIDTH)}
            onDragStart={(e) => e.preventDefault()}
            onDoubleClick={(e) => {
              e.stopPropagation()
              ed.updateProperty(node.id, 'popupWidth', declared.popupWidth?.default ?? 520)
            }}
            style={{
              position: 'absolute',
              left: `calc(50% + ${visibleWidth / 2}px - 3px)`,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 7,
              height: 26,
              borderRadius: 4,
              background: 'hsl(var(--wb-selection))',
              cursor: 'ew-resize',
              zIndex: 20,
            }}
          />
          <div
            draggable={false}
            data-ff-editor-helper
            onPointerDown={(e) => startResize(e, 'popupHeight', visibleHeight, POPUP_MIN_HEIGHT)}
            onDragStart={(e) => e.preventDefault()}
            onDoubleClick={(e) => {
              e.stopPropagation()
              ed.updateProperty(node.id, 'popupHeight', declared.popupHeight?.default ?? 380)
            }}
            style={{
              position: 'absolute',
              left: '50%',
              top: `calc(50% + ${visibleHeight / 2}px - 3px)`,
              transform: 'translateX(-50%)',
              width: 26,
              height: 7,
              borderRadius: 4,
              background: 'hsl(var(--wb-selection))',
              cursor: 'ns-resize',
              zIndex: 20,
            }}
          />
        </>
      )}
    </div>
  )
}
