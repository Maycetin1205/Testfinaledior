import { ROOT_ID, type BlockNode, type MaskTree } from './tree'
import { newSubtree } from './newBlock'
import { mayContain, blockType } from './registry'
import {
  AREA_COLUMNS,
  firstGap,
  fitSlot,
  nearestFreeSlot,
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

// The room between the edge of the page and its grid, in the editor as in
// the mask: one gap of the mask (--se-gap).
export const ROOT_PADDING = 8

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

// The slots an area's blocks take, without the one named.
export function takenOn(tree: MaskTree, parentId: string, exceptId?: string): GridSlot[] {
  return childrenInFlow(tree, parentId)
    .filter((n) => n.id !== exceptId)
    .map((n) => gridSlotRead(n.values))
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
  const spot = nearestFreeSlot(takenOn(tree, parentId, id), { x, y: Math.max(0, y), w, h }, columns, null)
  if (!spot) return null
  const nx = spot.x
  const ny = spot.y

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
  return keptInside(next, id, w)
}

// A new place and size in the same area, kept inside the columns and off
// the other blocks: the pulled sides stop at a neighbour.
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
  const spec = gridMetricsOf(blockType(node.type))
  const pulled = {
    x: Math.max(0, Math.min(slot.x, columns - 1)),
    y: Math.max(0, slot.y),
    w: 0,
    h: Math.max(1, slot.h),
  }
  pulled.w = Math.max(1, Math.min(slot.w, columns - pulled.x))
  const { x, y, w, h } = fitSlot(takenOn(tree, node.parentId, id), cur, pulled, {
    w: Math.max(1, spec.minWidth),
    h: Math.max(1, spec.minHeight),
  })
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
  const spot = nearestFreeSlot(takenOn(tree, parentId), { x, y: Math.max(0, y), w, h: spec.startHeight }, columns, null)
  if (!spot) return null
  node.values = { ...node.values, gridX: spot.x, gridY: spot.y, gridW: w, gridH: spec.startHeight }
  return {
    tree: {
      ...tree,
      ...nodes,
      [parent.id]: { ...parent, childIds: [...parent.childIds, node.id] },
    },
    node,
  }
}
