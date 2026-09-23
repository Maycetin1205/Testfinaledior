import type { PointerEvent as ReactPointerEvent } from 'react'

const KEY = 'aufbau_editor_inspector_breite'

export const INSPECTOR_MIN = 300
export const INSPECTOR_MAX = 600
const INSPECTOR_DEFAULT = 400

export function clampWidth(n: number): number {
  if (!Number.isFinite(n)) return INSPECTOR_DEFAULT
  return Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, Math.round(n)))
}

export function readWidth(): number {
  try {
    if (typeof localStorage === 'undefined') return INSPECTOR_DEFAULT
    const raw = localStorage.getItem(KEY)
    return raw === null ? INSPECTOR_DEFAULT : clampWidth(Number(raw))
  } catch {
    return INSPECTOR_DEFAULT
  }
}

export function rememberWidth(width: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, String(width))
    }
  } catch {
    // Browser storage can be blocked; not remembering is no reason to fail.
  }
}

export function startWidthsDrag(
  e: ReactPointerEvent<HTMLElement>,
  startWidth: number,
  show: (width: number) => void,
  adopt: (width: number) => void,
): void {
  if (e.button !== 0) return
  e.preventDefault()

  const startX = e.clientX
  let last = startWidth

  const selectionBefore = document.body.style.userSelect
  document.body.style.userSelect = 'none'

  const cleanUp = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onRelease)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('blur', onCancel)
    document.body.style.userSelect = selectionBefore
  }

  function onMove(ev: PointerEvent): void {
    last = clampWidth(startWidth + (startX - ev.clientX))
    show(last)
  }

  function onRelease(): void {
    cleanUp()
    adopt(last)
  }

  function onCancel(): void {
    cleanUp()
    show(startWidth)
  }

  function onKey(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape') return
    ev.preventDefault()
    onCancel()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onRelease)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  window.addEventListener('blur', onCancel)
}

export const WIDTHS_STEP = 16
