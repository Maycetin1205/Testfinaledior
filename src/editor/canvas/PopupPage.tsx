import { useEffect, useRef, useState } from 'react'
import { DIALOG_EDGE, DIALOG_CLOSE_EVENT } from '../../blocks/dialog/DialogFrame'
import { blockType } from '../../core/block/registry'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { NodeList } from './NodeList'
import { isNewBlockDrag } from './dnd'
import { commitDrop, useDnd } from './dndState'
import { gridTarget } from './gridDnd'
import { areaUnderPointer } from './gridArea'
import { axesOf, dragSize, type Axis } from './dragSize'
import { Grip } from './Grip'
import { GRIPS } from './useBlockResize'

const POPUP_SIZE: Record<Axis, 'popupWidth' | 'popupHeight'> = { width: 'popupWidth', height: 'popupHeight' }

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

      {/* The window stays in the middle; every edge and corner pulls its size. */}
      {selected && (
        <div
          data-ff-editor-helper
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ width: visibleWidth, height: visibleHeight }}
        >
          {GRIPS.map((edge) => (
            <Grip
              key={edge}
              edge={edge}
              onStart={(e) => dragSize(ed, e, edge, { width: visibleWidth, height: visibleHeight },
                (axis, value) => ed.updateProperty(node.id, POPUP_SIZE[axis], value))}
              onReset={() => ed.transaction(() => {
                for (const axis of axesOf(edge)) {
                  ed.updateProperty(node.id, POPUP_SIZE[axis], declared[POPUP_SIZE[axis]]?.default)
                }
              })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
