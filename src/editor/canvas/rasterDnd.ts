// Wohin ein gezogener Baustein im Raster faellt.
import type { DragEvent } from 'react'
import { darfEnthalten, bausteinArt } from '../../core/blocks/blockRegistry'
import { RASTER, rasterMassVon } from '../../core/blocks/rasterLayout'
import type { useEditor } from '../../state/useEditor'
import { newBlockDragType } from './dnd'
import type { DndState, DropTarget } from './dndState'

export function zelleAusZeiger(
  gridEl: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const stil = getComputedStyle(gridEl)
  const rect = gridEl.getBoundingClientRect()
  const padL = parseFloat(stil.paddingLeft) || 0
  const padT = parseFloat(stil.paddingTop) || 0
  const spaltenGap = parseFloat(stil.columnGap) || RASTER.gapPx
  const zeilenGap = parseFloat(stil.rowGap) || RASTER.gapPx

  const lx = clientX - rect.left - padL + gridEl.scrollLeft
  const ly = clientY - rect.top - padT + gridEl.scrollTop

  const spalten = stil.gridTemplateColumns
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let x = 0
  let xkante = 0
  while (x < spalten.length) {
    if (lx < xkante + spalten[x]) break
    xkante += spalten[x] + spaltenGap
    x++
  }
  x = Math.max(0, Math.min(RASTER.spalten - 1, x))

  const tracks = stil.gridTemplateRows
    .split(' ')
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))
  let y = 0
  let kante = 0
  while (y < tracks.length) {
    if (ly < kante + tracks[y]) break
    kante += tracks[y] + zeilenGap
    y++
  }
  if (y >= tracks.length) {
    const pitch = RASTER.zeilePx + zeilenGap
    y = tracks.length + (pitch > 0 ? Math.max(0, Math.floor((ly - kante) / pitch)) : 0)
  }
  return { x, y: Math.max(0, y) }
}

function gezogeneGroesse(
  ed: ReturnType<typeof useEditor>,
  dnd: DndState,
  dt: DataTransfer,
  parentId: string,
): { w: number; h: number } | null {
  const parent = ed.getNode(parentId)
  if (!parent) return null
  if (dnd.dragId !== null) {
    const node = ed.getNode(dnd.dragId)
    if (!node || !darfEnthalten(parent.type, node.type)) return null
    const spec = rasterMassVon(bausteinArt(node.type))
    return { w: spec.startW, h: spec.startH }
  }
  const type = newBlockDragType(dt)
  const def = type ? bausteinArt(type) : undefined
  if (!type || !def || !darfEnthalten(parent.type, type)) return null
  const spec = rasterMassVon(def)
  return { w: spec.startW, h: spec.startH }
}

export function rasterZiel(
  e: DragEvent,
  ed: ReturnType<typeof useEditor>,
  dnd: DndState,
  parentId: string,
  gridEl: HTMLElement,
): Extract<DropTarget, { kind: 'raster' }> | null {
  const groesse = gezogeneGroesse(ed, dnd, e.dataTransfer, parentId)
  if (!groesse) return null
  const zelle = zelleAusZeiger(gridEl, e.clientX, e.clientY)
  const x = Math.max(0, Math.min(zelle.x, RASTER.spalten - groesse.w))
  const y = Math.max(0, zelle.y)
  return { kind: 'raster', parentId, x, y, w: groesse.w, h: groesse.h }
}
