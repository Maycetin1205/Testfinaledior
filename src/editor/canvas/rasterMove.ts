// Die Zug-Regel: Druecken und Bewegen zieht immer den Baustein.
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Baustein } from '../../kern/maske/baum'
import { RASTER, rasterPlatzLesen } from '../../kern/maske/raster'
import { darfEnthalten } from '../../kern/maske/registry'
import type { Editor } from '../zustand/Editor'
import type { DndState } from './dndState'
import { zelleAusZeiger } from './rasterDnd'
import {
  flaecheUnterZeiger,
  flaecheVon,
  zeilenKapazitaet,
  zeileImKasten,
  type FlaechenTreffer,
} from './rasterFlaeche'

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
  // Der Zug gehoert dem Baustein, den der Zeiger traf. Ohne das zoege ein Kind
  // in einer geschachtelten Flaeche seinen Behaelter gleich mit.
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const rect = wrapper.getBoundingClientRect()

  const greif = { x: startX - rect.left, y: startY - rect.top }
  const pos = rasterPlatzLesen(node.werte)
  const id = node.id
  const eigene: FlaechenTreffer = { parentId, flaeche: gridEl }
  let aktiv = false
  let letztes: { ziel: FlaechenTreffer; x: number; y: number } | null = null

  // Zeigt der Nutzer auf keine Flaeche, die den Baustein aufnimmt, bleibt er in
  // seiner eigenen: sonst spraenge er beim Ziehen ueber den Rand irgendwohin.
  const zielFlaeche = (x: number, y: number): FlaechenTreffer => {
    const treffer = flaecheUnterZeiger(editor.tree, editor.rootId, x, y)
    if (!treffer || treffer.parentId === parentId) return eigene
    const ziel = editor.getNode(treffer.parentId)
    if (!ziel || !darfEnthalten(ziel.typ, node.typ) || editor.isInSubtree(id, treffer.parentId)) {
      return eigene
    }
    return treffer
  }

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
    const ziel = zielFlaeche(ev.clientX, ev.clientY)
    const zelle = zelleAusZeiger(ziel.flaeche, ev.clientX - greif.x, ev.clientY - greif.y)
    const x = Math.max(0, Math.min(zelle.x, RASTER.spalten - pos.w))
    const kapazitaet = zeilenKapazitaet(editor.tree, ziel.parentId, ziel.flaeche)
    const y = zeileImKasten(kapazitaet, zelle.y, pos.h)
    letztes = { ziel, x, y }
    dnd.setDropTarget({ kind: 'raster', parentId: ziel.parentId, x, y, w: pos.w, h: pos.h })
  }

  const onUp = (): void => {
    aufraeumen()
    if (aktiv && letztes) {
      editor.moveNodeToCell(id, letztes.ziel.parentId, letztes.x, letztes.y)
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
