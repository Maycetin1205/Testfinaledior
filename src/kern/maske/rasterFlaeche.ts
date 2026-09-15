// Bausteine im Raster verschieben, groesser ziehen und umhaengen.
import { WURZEL_ID, type Baustein, type Maskenbaum } from './baum'
import { neuerTeilbaum } from './neuerBaustein'
import { darfEnthalten, bausteinArt } from './registry'
import { istRandBaustein } from './maskenRand'
import {
  naechsteFreieZeile,
  rasterPlatzLesen,
  RASTER,
  rasterMassVon,
} from './raster'
import { istSeitenBaustein, kinderImFluss } from './seiten'
import { teilbaumIds } from './baumOps'

export function istRasterFlaeche(node: Baustein): boolean {
  return node.id === WURZEL_ID || istSeitenBaustein(node)
}

export function freieZeileAuf(tree: Maskenbaum, parentId: string): number {
  return naechsteFreieZeile(
    kinderImFluss(tree, parentId)
      .filter((n) => !istRandBaustein(n))
      .map((n) => rasterPlatzLesen(n.props)),
  )
}

export function freiePositionFuerKopie(
  tree: Maskenbaum,
  parentId: string,
  kopie: Baustein,
): Baustein {
  const eltern = tree[parentId]
  if (!eltern || !istRasterFlaeche(eltern)) return kopie
  const pos = rasterPlatzLesen(kopie.props)
  const y = freieZeileAuf(tree, parentId)
  if (y === pos.y) return kopie
  return {
    ...kopie,
    props: { ...kopie.props, rasterX: pos.x, rasterY: y, rasterW: pos.w, rasterH: pos.h },
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

  if (!darfEnthalten(newParent.type, node.type)) return null
  const oldParentId = node.parentId
  if (!oldParentId) return null
  const oldParent = tree[oldParentId]
  if (!oldParent) return null

  const next: Maskenbaum = { ...tree }

  if (oldParentId === newParentId) {
    const arr = oldParent.childIds.filter((c) => c !== id)
    const oldIndex = oldParent.childIds.indexOf(id)
    let target = oldIndex < index ? index - 1 : index
    target = Math.max(0, Math.min(target, arr.length))
    arr.splice(target, 0, id)
    next[oldParentId] = { ...oldParent, childIds: arr }
  } else {
    next[oldParentId] = { ...oldParent, childIds: oldParent.childIds.filter((c) => c !== id) }
    const arr = [...newParent.childIds]
    const target = Math.max(0, Math.min(index, arr.length))
    arr.splice(target, 0, id)
    next[newParentId] = { ...newParent, childIds: arr }
    next[id] = { ...node, parentId: newParentId }
    if (istRasterFlaeche(newParent)) {
      const pos = rasterPlatzLesen(node.props)
      const y = freieZeileAuf(tree, newParentId)
      next[id] = { ...next[id], props: { ...node.props, rasterX: 0, rasterY: y, rasterW: pos.w, rasterH: pos.h } }
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
  if (!darfEnthalten(parent.type, node.type)) return null

  if (teilbaumIds(tree, id).includes(parentId)) return null
  const gleicheFlaeche = node.parentId === parentId
  const cur = rasterPlatzLesen(node.props)
  const spec = rasterMassVon(bausteinArt(node.type))
  const w = gleicheFlaeche ? cur.w : spec.startW
  const h = gleicheFlaeche ? cur.h : spec.startH
  const nx = Math.max(0, Math.min(x, RASTER.spalten - w))
  const ny = Math.max(0, y)

  if (gleicheFlaeche && nx === cur.x && ny === cur.y && w === cur.w && h === cur.h) return null
  // Ohne bekannten alten und neuen Elternteil laesst sich der Baustein nicht
  // umhaengen: Canvas und Export gehen ueber childIds, er waere verwaist.
  if (!gleicheFlaeche && (!node.parentId || !tree[node.parentId] || !tree[parentId])) return null
  const next: Maskenbaum = { ...tree }
  if (!gleicheFlaeche && node.parentId && next[node.parentId]) {
    next[node.parentId] = {
      ...next[node.parentId],
      childIds: next[node.parentId].childIds.filter((c) => c !== id),
    }
    next[parentId] = { ...next[parentId], childIds: [...next[parentId].childIds, id] }
  }
  next[id] = {
    ...node,
    parentId,
    props: { ...node.props, rasterX: nx, rasterY: ny, rasterW: w, rasterH: h },
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
  if (!node || !node.parentId) return null
  const parent = tree[node.parentId]
  if (!parent || !istRasterFlaeche(parent)) return null
  const cur = rasterPlatzLesen(node.props)
  const w = achse === 'x' ? Math.max(1, Math.min(value, RASTER.spalten - cur.x)) : cur.w
  const h = achse === 'y' ? Math.max(1, value) : cur.h
  if (w === cur.w && h === cur.h) return null
  return {
    ...tree,
    [id]: { ...node, props: { ...node.props, rasterW: w, rasterH: h } },
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
  if (!parent || !istRasterFlaeche(parent) || !darfEnthalten(parent.type, type)) return null
  const { nodes, rootId } = neuerTeilbaum(type)
  const node = nodes[rootId]
  node.parentId = parent.id
  const spec = rasterMassVon(bausteinArt(type))
  const nx = Math.max(0, Math.min(x, RASTER.spalten - spec.startW))
  const ny = Math.max(0, y)
  node.props = { ...node.props, rasterX: nx, rasterY: ny, rasterW: spec.startW, rasterH: spec.startH }
  return {
    tree: {
      ...tree,
      ...nodes,
      [parent.id]: { ...parent, childIds: [...parent.childIds, node.id] },
    },
    node,
  }
}
