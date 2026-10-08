import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import type { SpotClick } from '../../blocks/base/BlockElement'
import type { EditorStore } from '../state/EditorStore'
import { DOUBLE_CLICK_WAIT } from './useBindingPicker'

// A click on the plus of the marked block, as the block reports it, waits as
// a click on a spot does, so a double click still types its text; then the
// block waits for the area it opens.
export function useAreaPickStart(
  editor: EditorStore,
  blockRef: RefObject<BlockNode>,
  spotClickOf: (click: Event) => SpotClick | null,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = (): void => {
    if (timer.current === null) return
    clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => stop, [])

  const onClick = (e: ReactMouseEvent<HTMLDivElement>): void => {
    stop()
    const id = blockRef.current.id
    if (e.detail > 1 || editor.selectedId !== id || spotClickOf(e.nativeEvent)?.kind !== 'opener') return
    timer.current = setTimeout(() => {
      timer.current = null
      if (editor.selectedId === id) editor.pickAreaFor(id)
    }, DOUBLE_CLICK_WAIT)
  }

  return { onClick, onDoubleClick: stop }
}
