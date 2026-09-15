// Die Zug-Regel: Druecken und Bewegen zieht immer den Baustein.
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Baustein } from '../../kern/maske/baum'
import { RASTER, rasterPlatzLesen } from '../../kern/maske/raster'
import type { Editor } from '../zustand/Editor'
import type { DndState } from './dndState'
import { zelleAusZeiger } from './rasterDnd'
import { flaecheVon } from './rasterFlaeche'

const ZUG_SCHWELLE = 4

// Klicken ohne Bewegung bleibt Klicken: der Zug wird erst ab der Schwelle aktiv,
// und nur dann wird der Folge-Klick geschluckt. Ihren pointerdown behalten allein
// die Editor-Anfasser und die Fenster.

function schluckeKlick(ev: MouseEvent): void {
  ev.stopPropagation()
  ev.preventDefault()
}

function inTextBearbeitung(e: ReactPointerEvent<HTMLElement>): boolean {
  for (const t of e.nativeEvent.composedPath()) {
    if (t === e.currentTarget) return false
    if (t instanceof HTMLElement && t.isContentEditable) return true
  }
  return false
}

export function ziehePosition(
  editor: Editor,
  dnd: DndState,
  e: ReactPointerEvent<HTMLElement>,
  node: Baustein,
  parentId: string,
): void {
  if (e.button !== 0) return
  if (inTextBearbeitung(e)) return
  const wrapper = e.currentTarget

  const gridEl = flaecheVon(wrapper)
  if (!gridEl) return
  const startX = e.clientX
  const startY = e.clientY
  const rect = wrapper.getBoundingClientRect()

  const greif = { x: startX - rect.left, y: startY - rect.top }
  const pos = rasterPlatzLesen(node.props)
  const id = node.id
  let aktiv = false
  let letztes: { x: number; y: number } | null = null

  const aufraeumen = (): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('blur', onCancel)

    window.removeEventListener('click', schluckeKlick, { capture: true })
  }

  const onMove = (ev: PointerEvent): void => {
    if (!aktiv) {
      if (Math.abs(ev.clientX - startX) < ZUG_SCHWELLE && Math.abs(ev.clientY - startY) < ZUG_SCHWELLE) return
      aktiv = true
      dnd.setDragId(id)
    }
    const zelle = zelleAusZeiger(gridEl, ev.clientX - greif.x, ev.clientY - greif.y)
    const x = Math.max(0, Math.min(zelle.x, RASTER.spalten - pos.w))
    const y = Math.max(0, zelle.y)
    letztes = { x, y }
    dnd.setDropTarget({ kind: 'raster', parentId, x, y, w: pos.w, h: pos.h })
  }

  const onUp = (): void => {
    aufraeumen()
    if (aktiv && letztes) {
      editor.moveNodeToCell(id, parentId, letztes.x, letztes.y)
  // Der Klick unmittelbar nach dem Ziehen wird geschluckt. Folgt keiner, raeumt
  // der Timeout auf, sonst frisst der Listener den naechsten Klick irgendwo.
      window.addEventListener('click', schluckeKlick, { capture: true, once: true })
      setTimeout(() => {
        window.removeEventListener('click', schluckeKlick, { capture: true })
      }, 0)
    }
    dnd.reset()
  }

  const onCancel = (): void => {
    aufraeumen()
    dnd.reset()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)

  window.addEventListener('blur', onCancel)
}
