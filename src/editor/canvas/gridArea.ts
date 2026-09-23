import { ROOT_ID, type BlockNode, type MaskTree } from '../../core/block/tree'
import { GRID } from '../../core/block/grid'
import { isGridArea } from '../../core/block/gridArea'
import { blockType } from '../../core/block/registry'
import { isPagesBlock } from '../../core/block/pages'

const ROOT_AREA_ATTR = 'data-ff-root-area'

export function areaOf(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.assignedSlot?.parentElement ?? wrapper.parentElement
}

function areaIn(host: Element | null | undefined): HTMLElement | null {
  const slot = host?.shadowRoot?.querySelector('slot:not([name])')
  const area = slot?.parentElement
  return area instanceof HTMLElement ? area : null
}

export interface AreasHit {
  parentId: string
  area: HTMLElement
}

function areaOfBlock(node: BlockNode): HTMLElement | null {
  const tag = blockType(node.type)?.tag
  if (!tag) return null
  const host = document.querySelector(`[data-block-id="${CSS.escape(node.id)}"]`)
  return areaIn(host?.querySelector(tag))
}

function areaOfPage(tree: MaskTree, pageId: string): HTMLElement | null {
  const page = tree[pageId]
  if (page && pageId !== ROOT_ID) return areaOfBlock(page)
  const root = document.querySelector(`[${ROOT_AREA_ATTR}]`)
  return root instanceof HTMLElement ? root : null
}

function contains(el: HTMLElement, x: number, y: number): boolean {
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

export function areaUnderPointer(
  tree: MaskTree,
  pageId: string,
  x: number,
  y: number,
): AreasHit | null {
  const pageArea = areaOfPage(tree, pageId)
  let hit: AreasHit | null = pageArea && contains(pageArea, x, y)
    ? { parentId: pageId, area: pageArea }
    : null
  const search = (id: string): void => {
    for (const childId of tree[id]?.childIds ?? []) {
      const child = tree[childId]
      if (!child) continue
      if (isGridArea(child)) {
        const area = areaOfBlock(child)
        if (area && contains(area, x, y)) hit = { parentId: child.id, area }
      }
      search(childId)
    }
  }
  search(pageId)
  return hit
}

export function rowsCapacity(
  tree: MaskTree,
  parentId: string,
  area: HTMLElement,
): number | null {
  const node = tree[parentId]
  if (!node || parentId === ROOT_ID || isPagesBlock(node)) return null
  if (blockType(node.type)?.gridArea !== true) return null
  const style = getComputedStyle(area)
  const inside = area.clientHeight
    - (parseFloat(style.paddingTop) || 0)
    - (parseFloat(style.paddingBottom) || 0)
  const gap = parseFloat(style.rowGap) || GRID.gapPx
  return Math.max(1, Math.floor((inside + gap) / (GRID.rowPx + gap)))
}

export function capacityOf(tree: MaskTree, id: string | null | undefined): number | null {
  const node = id ? tree[id] : undefined
  const area = node ? areaOfBlock(node) : null
  return node && area ? rowsCapacity(tree, node.id, area) : null
}

export function rowInBox(capacity: number | null, y: number, h: number): number {
  if (capacity === null) return Math.max(0, y)
  return Math.max(0, Math.min(y, capacity - h))
}

export function heightInBox(capacity: number | null, y: number, h: number): number {
  if (capacity === null) return h
  return Math.max(1, Math.min(h, capacity - y))
}
