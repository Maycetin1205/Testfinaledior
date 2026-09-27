import { ROOT_ID, type BlockNode, type MaskTree } from './tree'
import { newSubtree } from './newBlock'
import { mayContain, blockType } from './registry'
import {
  firstGap,
  nextFreeRow,
  gridSlotRead,
  GRID,
  gridMetricsOf,
  type GridSlot,
} from './grid'
import { isPagesBlock, childrenInFlow } from './pages'
import { subtreeIds } from './treeOps'

export function isGridArea(node: BlockNode): boolean {
  return node.id === ROOT_ID || isPagesBlock(node)
    || blockType(node.type)?.gridArea === true
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
  return firstGap(
    childrenInFlow(tree, parentId).map((n) => gridSlotRead(n.values)),
    w,
    h,
    rows,
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
      values: { ...copy.values, gridX: slot.x, gridY: slot.y, gridW: pos.w, gridH: pos.h },
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
      next[id] = { ...next[id], values: { ...node.values, gridX: 0, gridY: y, gridW: pos.w, gridH: pos.h } }
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
  const w = sameArea ? cur.w : spec.startWidth
  const h = sameArea ? cur.h : spec.startHeight
  const nx = Math.max(0, Math.min(x, GRID.columns - w))
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
  return next
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
  const x = Math.max(0, Math.min(slot.x, GRID.columns - 1))
  const w = Math.max(1, Math.min(slot.w, GRID.columns - x))
  const y = Math.max(0, slot.y)
  const h = Math.max(1, slot.h)
  if (x === cur.x && y === cur.y && w === cur.w && h === cur.h) return null
  return {
    ...tree,
    [id]: { ...node, values: { ...node.values, gridX: x, gridY: y, gridW: w, gridH: h } },
  }
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
  const nx = Math.max(0, Math.min(x, GRID.columns - spec.startWidth))
  const ny = Math.max(0, y)
  node.values = { ...node.values, gridX: nx, gridY: ny, gridW: spec.startWidth, gridH: spec.startHeight }
  return {
    tree: {
      ...tree,
      ...nodes,
      [parent.id]: { ...parent, childIds: [...parent.childIds, node.id] },
    },
    node,
  }
}
