import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { Plus } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import type { BlockNode } from '../../core/block/tree'
import {
  listDefaultTitle,
  withInner,
  type ListBinding,
} from '../../core/block/blockType'
import { useEditorInstance } from '../state/EditorContext'
import { useHeadsPlaced } from './useHeadsPlaced'

interface ColumnControlsProps {
  block: BlockNode
  selected: boolean

  // The entry whose bar is open.
  open: number | null

  binding: ListBinding

  element: HTMLElement | null

  host: RefObject<HTMLElement | null>

  container: RefObject<HTMLElement | null>
  onSelect?: () => void
}

const DRAG_THRESHOLD = 5

const HANDLE_EDGE = 6

// The plus at the end of the heads, as .vspalte-zahl: white with an edge.
const PLUS_SIZE = 20

export function ColumnControls({
  block, selected, open, binding, element, host, container, onSelect,
}: ColumnControlsProps) {
  const editor = useEditorInstance()

  // The block fills its host: what it reports from its own corner stands
  // there in the host as well.
  const { heads: spots, places } = useHeadsPlaced(element)
  const [drag, setDrag] = useState<{ from: number; slot: number } | null>(null)

  const openPicker = (index: number): void => {
    onSelect?.()
    const target = container.current
    const frame = host.current
    const s = spots[index]
    if (!target || !frame || !s) return
    const reference = frame.getBoundingClientRect()
    target.dispatchEvent(new CustomEvent('ff-list-bind', {
      detail: {
        prop: binding.prop,
        index: s.path.index,
        inner: s.path.inner,
        top: reference.top + s.top + s.height + 4,
        left: reference.left + s.left,
      },
    }))
  }

  // The title is typed on the head itself, one level down as well.
  const rename = (index: number): void => {
    const s = spots[index]
    if (!s) return
    s.rename((typed, original) => {
      if (typed === original) return
      const entries = binding.entries(block.values[binding.prop])
      const entry = entries[s.path.index]
      if (entry === undefined) return
      const at = s.path.inner
      if (at === undefined) {
        const next = [...entries]
        next[s.path.index] = binding.withTypedTitle(entry, typed === '' ? listDefaultTitle(binding, s.path.index) : typed)
        editor.updateProperty(block.id, binding.prop, next)
        return
      }
      const inner = binding.inner
      const list = inner ? [...inner.of(entry)] : []
      const own = list[at]
      if (!inner || own === undefined) return
      list[at] = inner.binding.withTypedTitle(own, typed === '' ? listDefaultTitle(inner.binding, at) : typed)
      editor.updateProperty(block.id, binding.prop, withInner(binding, entries, s.path.index, list))
    })
  }

  const entries = binding.entries(block.values[binding.prop])
  const added = binding.entryAdd?.(entries) ?? null

  // The entry whose bar is open waits for a click on a cell that places it.
  const waiting = open === null ? undefined : entries[open]
  const placing = waiting !== undefined && binding.entryPlace?.shown(waiting) === true ? binding.entryPlace : undefined

  // Only the heads of the list itself move by dragging, side by side.
  const heads = spots.filter((s) => s.path.inner === undefined && !s.below)

  const onPress = (index: number, e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const frame = host.current
    if (!frame) return

    const wasSelected = editor.selectedId === block.id
    const stays = spots[index]?.path.inner !== undefined || spots[index]?.below === true
    const startX = e.clientX
    const referenceLeft = frame.getBoundingClientRect().left
    const midway = heads.map((s) => referenceLeft + s.left + s.width / 2)
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
        if (stays || Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return
        drags = true
        document.body.style.cursor = 'grabbing'
      }
      ev.preventDefault()
      slot = slotOf(ev.clientX)
      setDrag({ from: index, slot })
    }
    function onEnd(): void {
      const what = drags
      const s = slot
      cleanUp()
      if (!what) {
        if (wasSelected) openPicker(index)
        else onSelect?.()
        return
      }
      if (binding.entryMove === undefined) return

      const of = spots[index]?.path.index ?? index
      const toRaw = heads[s]?.path.index ?? (heads[heads.length - 1]?.path.index ?? 0) + 1
      const next = binding.entryMove(entries, of, toRaw > of ? toRaw - 1 : toRaw)
      if (next !== null) editor.updateProperty(block.id, binding.prop, next)
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

  if (heads.length === 0) return null
  const first = heads[0]
  const last = heads[heads.length - 1]
  const line = drag === null
    ? null
    : drag.slot < heads.length ? heads[drag.slot].left : last.left + last.width
  // The plus keeps the top right corner of the head row, whichever head is
  // measured last: with sublines that is a small title under a column.
  const edge = Math.max(...heads.map((s) => s.left + s.width))
  const topLine = heads.reduce((a, s) => (s.top < a.top ? s : a), first)

  return (
    <div data-ff-editor-helper className="pointer-events-none absolute inset-0 z-10">
      {spots.map((s, i) => (
        <div
          key={i}
          className={cn(
            // 8 % of the selection color, as .dropzone.is-drop-aktiv lays over a column.
            'pointer-events-auto absolute cursor-pointer hover:bg-[hsl(var(--wb-selection)/0.08)]',
            drag?.from === i && 'bg-[hsl(var(--wb-selection)/0.08)]',
          )}
          style={{
            left: s.left + HANDLE_EDGE,
            top: s.top,
            width: Math.max(0, s.width - 2 * HANDLE_EDGE),
            height: s.height,
          }}
          onPointerDown={(e) => onPress(i, e)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation()
            rename(i)
          }}
        />
      ))}
      {open !== null && placing !== undefined && places.map((p) => (
        <div
          key={p.key}
          className="pointer-events-auto absolute cursor-pointer hover:bg-[hsl(var(--wb-selection)/0.08)]"
          style={{ left: p.left, top: p.top, width: p.width, height: p.height }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            const next = placing.placed(entries, open, p.key)
            if (next !== null) editor.updateProperty(block.id, binding.prop, next)
          }}
        />
      ))}
      {selected && added !== null && (
        <button
          type="button"
          aria-label="Spalte anfügen"
          title="Spalte anfügen"
          className="pointer-events-auto absolute grid place-items-center rounded border border-line bg-panel text-[hsl(var(--wb-selection))] hover:bg-[hsl(var(--wb-selection)/0.08)]"
          style={{
            left: edge - PLUS_SIZE - 4,
            top: topLine.top + (topLine.height - PLUS_SIZE) / 2,
            width: PLUS_SIZE,
            height: PLUS_SIZE,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            editor.updateProperty(block.id, binding.prop, added)
          }}
        >
          <Plus size={13} />
        </button>
      )}
      {line !== null && (
        <div
          className="absolute w-[3px] rounded bg-[hsl(var(--wb-selection))]"
          style={{ left: line - 1, top: first.top, height: first.height }}
        />
      )}
    </div>
  )
}
