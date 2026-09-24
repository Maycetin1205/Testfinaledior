import type { PointerEvent as ReactPointerEvent } from 'react'
import type { EditorStore } from '../state/EditorStore'

interface DragJob {
  axis: 'x' | 'y'

  prop: string

  getId: () => string

  start: number

  min: number

  factor?: number
}

export function dragSize(
  editor: EditorStore,
  e: ReactPointerEvent<HTMLElement>,
  job: DragJob,
): void {
  e.preventDefault()
  e.stopPropagation()
  const startPos = job.axis === 'x' ? e.clientX : e.clientY

  let last = Math.max(job.min, Math.round(job.start))

  const bracket = editor.openGesture()
  const onMove = (ev: PointerEvent) => {
    const pos = job.axis === 'x' ? ev.clientX : ev.clientY
    const delta = (pos - startPos) * (job.factor ?? 1)
    const next = Math.max(job.min, Math.round(job.start + delta))
    if (next === last) return
    last = next
    bracket.open()
    editor.updateProperty(job.getId(), job.prop, next)
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
