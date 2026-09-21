// Bausteine im Raster verschieben, groesser ziehen und umhaengen.
import { WURZEL_ID, type Baustein, type Maskenbaum } from './baum'
import { neuerTeilbaum } from './neuerBaustein'
import { darfEnthalten, bausteinArt } from './registry'
import {
  ersteLuecke,
  naechsteFreieZeile,
  rasterPlatzLesen,
  RASTER,
  rasterMassVon,
} from './raster'
import { istSeitenBaustein, kinderImFluss } from './seiten'
import { teilbaumIds } from './baumOps'

export function istRasterFlaeche(node: Baustein): boolean {
  return node.id === WURZEL_ID || istSeitenBaustein(node)
    || bausteinArt(node.typ)?.rasterFlaeche === true
}

export function freieZeileAuf(tree: Maskenbaum, parentId: string): number {
  return naechsteFreieZeile(
    kinderImFluss(tree, parentId)
      .map((n) => rasterPlatzLesen(n.werte)),
  )
}

export function platzAuf(
  tree: Maskenbaum,
  parentId: string,
  w: number,
  h: number,
  zeilen: number | null,
): { x: number; y: number } | null {
  return ersteLuecke(
    kinderImFluss(tree, parentId).map((n) => rasterPlatzLesen(n.werte)),
    w,
    h,
    zeilen,
  )
}

export function freiePositionFuerKopie(
  tree: Maskenbaum,
  parentId: string,
  kopie: Baustein,
  zeilen: number | null = null,
): Baustein | null {
  const eltern = tree[parentId]
  if (!eltern || !istRasterFlaeche(eltern)) return kopie
  const pos = rasterPlatzLesen(kopie.werte)
  if (zeilen !== null) {
    const platz = platzAuf(tree, parentId, pos.w, pos.h, zeilen)
    if (!platz) return null
    return {
      ...kopie,
      werte: { ...kopie.werte, rasterX: platz.x, rasterY: platz.y, rasterW: pos.w, rasterH: pos.h },
    }
  }
  const y = freieZeileAuf(tree, parentId)
  if (y === pos.y) return kopie
  return {
    ...kopie,
    werte: { ...kopie.werte, rasterX: pos.x, rasterY: y, rasterW: pos.w, rasterH: pos.h },
  }
}

export function verschiebeInContainer(
  tree: Maskenbaum,
  id: string,
  newParentId: string,
  index: number,
): Maskenbaum | null {
  const node = tree[id]
  const newParent = tree[newParentId]
  if (!node || !newParent || id === WURZEL_ID) return null

  if (teilbaumIds(tree, id).includes(newParentId)) return null

  if (!darfEnthalten(newParent.typ, node.typ)) return null
  const oldParentId = node.elternId
  if (!oldParentId) return null
  const oldParent = tree[oldParentId]
  if (!oldParent) return null

  const next: Maskenbaum = { ...tree }

  if (oldParentId === newParentId) {
    const arr = oldParent.kinderIds.filter((c) => c !== id)
    const oldIndex = oldParent.kinderIds.indexOf(id)
    let target = oldIndex < index ? index - 1 : index
    target = Math.max(0, Math.min(target, arr.length))
    arr.splice(target, 0, id)
    next[oldParentId] = { ...oldParent, kinderIds: arr }
  } else {
    next[oldParentId] = { ...oldParent, kinderIds: oldParent.kinderIds.filter((c) => c !== id) }
    const arr = [...newParent.kinderIds]
    const target = Math.max(0, Math.min(index, arr.length))
    arr.splice(target, 0, id)
    next[newParentId] = { ...newParent, kinderIds: arr }
    next[id] = { ...node, elternId: newParentId }
    if (istRasterFlaeche(newParent)) {
      const pos = rasterPlatzLesen(node.werte)
      const y = freieZeileAuf(tree, newParentId)
      next[id] = { ...next[id], werte: { ...node.werte, rasterX: 0, rasterY: y, rasterW: pos.w, rasterH: pos.h } }
    }
  }
  return next
}

export function zelleneinzug(
  tree: Maskenbaum,
  id: string,
  parentId: string,
  x: number,
  y: number,
): Maskenbaum | null {
  const node = tree[id]
  const parent = tree[parentId]
  if (!node || !parent || id === WURZEL_ID) return null
  if (!istRasterFlaeche(parent)) return null
  if (!darfEnthalten(parent.typ, node.typ)) return null

  if (teilbaumIds(tree, id).includes(parentId)) return null
  const gleicheFlaeche = node.elternId === parentId
  const cur = rasterPlatzLesen(node.werte)
  const spec = rasterMassVon(bausteinArt(node.typ))
  const w = gleicheFlaeche ? cur.w : spec.startBreite
  const h = gleicheFlaeche ? cur.h : spec.startHoehe
  const nx = Math.max(0, Math.min(x, RASTER.spalten - w))
  const ny = Math.max(0, y)

  if (gleicheFlaeche && nx === cur.x && ny === cur.y && w === cur.w && h === cur.h) return null
  // Ohne bekannten alten und neuen Elternteil laesst sich der Baustein nicht
  // umhaengen: Canvas und Export gehen ueber childIds, er waere verwaist.
  if (!gleicheFlaeche && (!node.elternId || !tree[node.elternId] || !tree[parentId])) return null
  const next: Maskenbaum = { ...tree }
  if (!gleicheFlaeche && node.elternId && next[node.elternId]) {
    next[node.elternId] = {
      ...next[node.elternId],
      kinderIds: next[node.elternId].kinderIds.filter((c) => c !== id),
    }
    next[parentId] = { ...next[parentId], kinderIds: [...next[parentId].kinderIds, id] }
  }
  next[id] = {
    ...node,
    elternId: parentId,
    werte: { ...node.werte, rasterX: nx, rasterY: ny, rasterW: w, rasterH: h },
  }
  return next
}

export function zellenGroesse(
  tree: Maskenbaum,
  id: string,
  achse: 'x' | 'y',
  value: number,
): Maskenbaum | null {
  const node = tree[id]
  if (!node || !node.elternId) return null
  const parent = tree[node.elternId]
  if (!parent || !istRasterFlaeche(parent)) return null
  const cur = rasterPlatzLesen(node.werte)
  const w = achse === 'x' ? Math.max(1, Math.min(value, RASTER.spalten - cur.x)) : cur.w
  const h = achse === 'y' ? Math.max(1, value) : cur.h
  if (w === cur.w && h === cur.h) return null
  return {
    ...tree,
    [id]: { ...node, werte: { ...node.werte, rasterW: w, rasterH: h } },
  }
}

export function neuerBlockAnZelle(
  tree: Maskenbaum,
  type: string,
  parentId: string,
  x: number,
  y: number,
): { tree: Maskenbaum; node: Baustein } | null {
  const parent = tree[parentId]
  if (!parent || !istRasterFlaeche(parent) || !darfEnthalten(parent.typ, type)) return null
  const { nodes, rootId } = neuerTeilbaum(type)
  const node = nodes[rootId]
  node.elternId = parent.id
  const spec = rasterMassVon(bausteinArt(type))
  const nx = Math.max(0, Math.min(x, RASTER.spalten - spec.startBreite))
  const ny = Math.max(0, y)
  node.werte = { ...node.werte, rasterX: nx, rasterY: ny, rasterW: spec.startBreite, rasterH: spec.startHoehe }
  return {
    tree: {
      ...tree,
      ...nodes,
      [parent.id]: { ...parent, kinderIds: [...parent.kinderIds, node.id] },
    },
    node,
  }
}
