import { ROOT_ID, type BlockNode, type MaskTree } from './tree'
import { newSubtree } from './newBlock'
import { mayContain, blockType } from './registry'
import {
  AREA_COLUMNS,
  firstGap,
  nextFreeRow,
  gridSlotRead,
  GRID,
  gridMetricsOf,
  growMinHeightPx,
  growRowsTemplate,
  type GridSlot,
} from './grid'
import { isPagesBlock, childrenInFlow, pageOf } from './pages'
import { subtreeIds } from './treeOps'

export function isGridArea(node: BlockNode): boolean {
  return node.id === ROOT_ID || isPagesBlock(node)
    || blockType(node.type)?.gridArea === true
}

// An area inside a page, like a box: as many columns as it is wide on the
// page, so what it holds keeps the page's grid.
const isInnerArea = (node: BlockNode | undefined): node is BlockNode =>
  node !== undefined && node.id !== ROOT_ID && !isPagesBlock(node) && blockType(node.type)?.gridArea === true

export function columnsOf(tree: MaskTree, parentId: string | null | undefined): number {
  const parent = parentId ? tree[parentId] : undefined
  return isInnerArea(parent) ? gridSlotRead(parent.values).w : GRID.columns
}

// The style that tells an inner area how many columns it has.
export function areaColumnsStyle(node: BlockNode): Record<string, number> {
  return isInnerArea(node) ? { [AREA_COLUMNS]: gridSlotRead(node.values).w } : {}
}

// What an area holds stays inside it when it gets narrower, down to the areas
// inside it.
function keptInside(tree: MaskTree, areaId: string, columns: number): MaskTree {
  const area = tree[areaId]
  if (!isInnerArea(area)) return tree
  let next = tree
  for (const childId of area.childIds) {
    const child = next[childId]
    if (!child) continue
    const pos = gridSlotRead(child.values)
    const x = Math.min(pos.x, columns - 1)
    const w = Math.min(pos.w, columns - x)
    if (x === pos.x && w === pos.w) continue
    next = keptInside({ ...next, [childId]: { ...child, values: { ...child.values, gridX: x, gridW: w } } }, childId, w)
  }
  return next
}

const growsOnPage = (node: BlockNode): boolean =>
  node.parentId === ROOT_ID && gridMetricsOf(blockType(node.type)).grows

// The rows of the page, so a list on it fills the window downward.
export function pageRowsTemplate(tree: MaskTree): string | null {
  return growRowsTemplate(childrenInFlow(tree, ROOT_ID).map((n) => ({
    slot: gridSlotRead(n.values),
    grows: growsOnPage(n),
  })))
}

// The least height of a list that grows on the page.
export function growMinHeightStyle(node: BlockNode): Record<string, string> {
  if (!growsOnPage(node)) return {}
  const spec = gridMetricsOf(blockType(node.type))
  return { minHeight: `${growMinHeightPx(spec.minHeight, gridSlotRead(node.values).h)}px` }
}

// A block laid on the lower part of a list on the page shortens the list so
// it ends above the block.
function growersEndAbove(tree: MaskTree, id: string): MaskTree {
  const node = tree[id]
  if (!node || node.parentId !== ROOT_ID || growsOnPage(node)) return tree
  const pos = gridSlotRead(node.values)
  let next = tree
  for (const other of childrenInFlow(tree, ROOT_ID)) {
    if (other.id === id || !growsOnPage(other)) continue
    const g = gridSlotRead(other.values)
    const besideX = pos.x + pos.w <= g.x || g.x + g.w <= pos.x
    if (besideX || pos.y <= g.y || pos.y >= g.y + g.h) continue
    next = { ...next, [other.id]: { ...other, values: { ...other.values, gridH: pos.y - g.y } } }
  }
  return next
}

export function freeRowOn(tree: MaskTree, parentId: string): number {
  return nextFreeRow(
    childrenInFlow(tree, parentId)
      .map((n) => gridSlotRead(n.values)),
  )
}

export function slotOn(
  tree: MaskTree,
  parentId: string,
  w: number,
  h: number,
  rows: number | null,
): { x: number; y: number } | null {
  const columns = columnsOf(tree, parentId)
  return firstGap(
    childrenInFlow(tree, parentId).map((n) => gridSlotRead(n.values)),
    Math.min(w, columns),
    h,
    rows,
    columns,
  )
}

export function freePositionForCopy(
  tree: MaskTree,
  parentId: string,
  copy: BlockNode,
  rows: number | null = null,
): BlockNode | null {
  const parent = tree[parentId]
  if (!parent || !isGridArea(parent)) return copy
  const pos = gridSlotRead(copy.values)
  if (rows !== null) {
    const slot = slotOn(tree, parentId, pos.w, pos.h, rows)
    if (!slot) return null
    return {
      ...copy,
      values: { ...copy.values, gridX: slot.x, gridY: slot.y, gridW: Math.min(pos.w, columnsOf(tree, parentId)), gridH: pos.h },
    }
  }
  const y = freeRowOn(tree, parentId)
  if (y === pos.y) return copy
  return {
    ...copy,
    values: { ...copy.values, gridX: pos.x, gridY: y, gridW: pos.w, gridH: pos.h },
  }
}

export function moveInContainer(
  tree: MaskTree,
  id: string,
  newParentId: string,
  index: number,
): MaskTree | null {
  const node = tree[id]
  const newParent = tree[newParentId]
  if (!node || !newParent || id === ROOT_ID) return null

  if (subtreeIds(tree, id).includes(newParentId)) return null

  if (!mayContain(newParent.type, node.type)) return null
  const oldParentId = node.parentId
  if (!oldParentId) return null
  const oldParent = tree[oldParentId]
  if (!oldParent) return null

  const next: MaskTree = { ...tree }

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
    if (isGridArea(newParent)) {
      const pos = gridSlotRead(node.values)
      const y = freeRowOn(tree, newParentId)
      const w = Math.min(pos.w, columnsOf(tree, newParentId))
      next[id] = { ...next[id], values: { ...node.values, gridX: 0, gridY: y, gridW: w, gridH: pos.h } }
    }
  }
  return next
}

export function cellMoveIn(
  tree: MaskTree,
  id: string,
  parentId: string,
  x: number,
  y: number,
): MaskTree | null {
  const node = tree[id]
  const parent = tree[parentId]
  if (!node || !parent || id === ROOT_ID) return null
  if (!isGridArea(parent)) return null
  if (!mayContain(parent.type, node.type)) return null

  if (subtreeIds(tree, id).includes(parentId)) return null
  const sameArea = node.parentId === parentId
  const cur = gridSlotRead(node.values)
  const spec = gridMetricsOf(blockType(node.type))
  // Within a page every area has the page's grid, so a block keeps its size;
  // into another page it starts anew.
  const samePage = sameArea || (node.parentId !== null && pageOf(tree, node.parentId) === pageOf(tree, parentId))
  const columns = columnsOf(tree, parentId)
  const w = Math.min(samePage ? cur.w : spec.startWidth, columns)
  const h = samePage ? cur.h : spec.startHeight
  const nx = Math.max(0, Math.min(x, columns - w))
  const ny = Math.max(0, y)

  if (sameArea && nx === cur.x && ny === cur.y && w === cur.w && h === cur.h) return null

  if (!sameArea && (!node.parentId || !tree[node.parentId] || !tree[parentId])) return null
  const next: MaskTree = { ...tree }
  if (!sameArea && node.parentId && next[node.parentId]) {
    next[node.parentId] = {
      ...next[node.parentId],
      childIds: next[node.parentId].childIds.filter((c) => c !== id),
    }
    next[parentId] = { ...next[parentId], childIds: [...next[parentId].childIds, id] }
  }
  next[id] = {
    ...node,
    parentId: parentId,
    values: { ...node.values, gridX: nx, gridY: ny, gridW: w, gridH: h },
  }
  return growersEndAbove(keptInside(next, id, w), id)
}

// A new place and size in the same area, kept inside the columns.
export function slotResize(
  tree: MaskTree,
  id: string,
  slot: GridSlot,
): MaskTree | null {
  const node = tree[id]
  if (!node || !node.parentId) return null
  const parent = tree[node.parentId]
  if (!parent || !isGridArea(parent)) return null
  const cur = gridSlotRead(node.values)
  const columns = columnsOf(tree, node.parentId)
  const x = Math.max(0, Math.min(slot.x, columns - 1))
  const w = Math.max(1, Math.min(slot.w, columns - x))
  const y = Math.max(0, slot.y)
  const h = Math.max(1, slot.h)
  if (x === cur.x && y === cur.y && w === cur.w && h === cur.h) return null
  return keptInside({
    ...tree,
    [id]: { ...node, values: { ...node.values, gridX: x, gridY: y, gridW: w, gridH: h } },
  }, id, w)
}

export function newBlockOnCell(
  tree: MaskTree,
  type: string,
  parentId: string,
  x: number,
  y: number,
): { tree: MaskTree; node: BlockNode } | null {
  const parent = tree[parentId]
  if (!parent || !isGridArea(parent) || !mayContain(parent.type, type)) return null
  const { nodes, rootId } = newSubtree(type)
  const node = nodes[rootId]
  node.parentId = parent.id
  const spec = gridMetricsOf(blockType(type))
  const columns = columnsOf(tree, parentId)
  const w = Math.min(spec.startWidth, columns)
  const nx = Math.max(0, Math.min(x, columns - w))
  const ny = Math.max(0, y)
  node.values = { ...node.values, gridX: nx, gridY: ny, gridW: w, gridH: spec.startHeight }
  return {
    tree: growersEndAbove({
      ...tree,
      ...nodes,
      [parent.id]: { ...parent, childIds: [...parent.childIds, node.id] },
    }, node.id),
    node,
  }
}
