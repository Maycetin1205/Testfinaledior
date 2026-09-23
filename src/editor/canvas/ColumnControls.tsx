import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { cn } from '@/editor/widgets/cn'
import type { BlockNode } from '../../core/block/tree'
import type { ListBinding } from '../../core/block/blockType'
import { useEditorInstance } from '../state/EditorContext'
import { applyProps } from '../state/valuesPatch'

interface Spot {
  left: number
  top: number
  width: number
  height: number

  slot: number
}

interface ColumnsControlsProps {
  block: BlockNode
  binding: ListBinding
  selector: string

  element: HTMLElement | null

  host: RefObject<HTMLElement | null>

  container: RefObject<HTMLElement | null>
  onSelect?: () => void
}

const DRAG_THRESHOLD = 5

const HANDLE_EDGE = 6

function measure(element: HTMLElement, host: HTMLElement, selector: string): Spot[] {
  const root = element.shadowRoot
  if (!root) return []
  const reference = host.getBoundingClientRect()
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).map((el, i) => {
    const r = el.getBoundingClientRect()
    const raw = Number(el.getAttribute('data-ff-entry'))
    return {
      left: r.left - reference.left,
      top: r.top - reference.top,
      width: r.width,
      height: r.height,
      slot: Number.isInteger(raw) ? raw : i,
    }
  })
}

export function ColumnsControls({
  block, binding, selector, element, host, container, onSelect,
}: ColumnsControlsProps) {
  const editor = useEditorInstance()
  const [spots, setSpots] = useState<Spot[]>([])
  const [drag, setDrag] = useState<{ of: number; slot: number } | null>(null)

  useEffect(() => {
    const el = element
    const frame = host.current
    if (!el || !frame || !el.shadowRoot) return
    const remeasure = (): void => setSpots(measure(el, frame, selector))

    const ro = new ResizeObserver(remeasure)
    ro.observe(el)
    const mo = new MutationObserver(remeasure)
    mo.observe(el.shadowRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-ff-entry'],
    })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [element, host, selector])

  const openPicker = (index: number): void => {
    onSelect?.()
    const target = container.current
    const frame = host.current
    const s = spots[index]
    if (!target || !frame || !s) return
    const reference = frame.getBoundingClientRect()
    target.dispatchEvent(new CustomEvent('ff-listen-bind', {
      detail: {
        prop: binding.prop,
        index: s.slot,
        top: reference.top + s.top + s.height + 4,
        left: reference.left + s.left,
      },
    }))
  }

  const onPress = (index: number, e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const frame = host.current
    if (!frame) return

    const whatChosen = editor.selectedId === block.id
    const startX = e.clientX
    const referenceLeft = frame.getBoundingClientRect().left
    const midway = spots.map((s) => referenceLeft + s.left + s.width / 2)
    let drags = false
    let slot = index
    const slotOf = (x: number): number => {
      for (let i = 0; i < midway.length; i++) if (x < midway[i]) return i
      return midway.length
    }
    const cleanUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
      window.removeEventListener('keydown', onKey, true)
      if (drags) document.body.style.cursor = ''
      setDrag(null)
    }
    function onMove(ev: PointerEvent): void {
      if (!drags) {
        if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return
        drags = true
        document.body.style.cursor = 'grabbing'
      }
      ev.preventDefault()
      slot = slotOf(ev.clientX)
      setDrag({ of: index, slot })
    }
    function onEnd(): void {
      const what = drags
      const s = slot
      cleanUp()
      if (!what) {
        if (whatChosen) openPicker(index)
        else onSelect?.()
        return
      }
      const move = binding.entryMove
      if (!move) return

      const of = spots[index]?.slot ?? index
      const toRaw = spots[s]?.slot ?? (spots[spots.length - 1]?.slot ?? 0) + 1
      applyProps(editor, block.id, move(block.values, of, toRaw > of ? toRaw - 1 : toRaw))
    }
    function onCancel(): void {
      cleanUp()
    }
    function onKey(ev: KeyboardEvent): void {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      cleanUp()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    window.addEventListener('keydown', onKey, true)
  }

  if (spots.length === 0) return null
  const first = spots[0]
  const last = spots[spots.length - 1]
  const line = drag === null
    ? null
    : drag.slot < spots.length ? spots[drag.slot].left : last.left + last.width

  return (
    <div data-ff-editor-helper className="pointer-events-none absolute inset-0 z-10">
      {spots.map((s, i) => (
        <div
          key={i}
          className={cn(
            'pointer-events-auto absolute cursor-pointer hover:bg-[hsl(var(--wb-auswahl)/0.10)]',
            drag?.of === i && 'bg-[hsl(var(--wb-auswahl)/0.10)]',
          )}
          style={{
            left: s.left + HANDLE_EDGE,
            top: s.top,
            width: Math.max(0, s.width - 2 * HANDLE_EDGE),
            height: s.height,
          }}
          onPointerDown={(e) => onPress(i, e)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      ))}
      {line !== null && (
        <div
          className="absolute w-[3px] rounded-[1px] bg-[hsl(var(--wb-auswahl))]"
          style={{ left: line - 1, top: first.top, height: first.height }}
        />
      )}
    </div>
  )
}
