import type { PointerEvent as ReactPointerEvent } from 'react'
import { DIALOG_MIN_HEIGHT, DIALOG_MIN_WIDTH } from '../../blocks/dialog/DialogFrame'
import type { EditorStore } from '../state/EditorStore'
import type { Edge } from './useBlockResize'

export type Axis = 'width' | 'height'

interface Size {
  width: number
  height: number
}

export function axesOf(edge: Edge): Axis[] {
  return [
    ...(/[ew]/.test(edge) ? ['width' as const] : []),
    ...(/[ns]/.test(edge) ? ['height' as const] : []),
  ]
}

// Pulls a window that stays in the middle: the pulled edge follows the pointer
// and the opposite one moves as far, so the size changes twice the way. One
// pull is one step back.
export function dragSize(
  editor: EditorStore,
  e: ReactPointerEvent<HTMLElement>,
  edge: Edge,
  start: Size,
  write: (axis: Axis, value: number) => void,
): void {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const min: Size = { width: DIALOG_MIN_WIDTH, height: DIALOG_MIN_HEIGHT }
  const last: Size = { width: Math.round(start.width), height: Math.round(start.height) }

  const bracket = editor.openGesture()
  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    const pulled: Size = {
      width: start.width + 2 * (edge.includes('e') ? dx : edge.includes('w') ? -dx : 0),
      height: start.height + 2 * (edge.includes('s') ? dy : edge.includes('n') ? -dy : 0),
    }
    for (const axis of axesOf(edge)) {
      const next = Math.max(min[axis], Math.round(pulled[axis]))
      if (next === last[axis]) continue
      last[axis] = next
      bracket.open()
      write(axis, next)
    }
  }

  const finish = () => {
    bracket.close()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    window.removeEventListener('blur', finish)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', finish)
  window.addEventListener('pointercancel', finish)
  window.addEventListener('blur', finish)
}
