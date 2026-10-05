import { capability } from '../../../core/block/capability'
import { gridMetricsOf } from '../../../core/block/grid'
import { columnsOf, isGridArea, slotOn } from '../../../core/block/gridArea'
import { newSubtree } from '../../../core/block/newBlock'
import { writeValue, type PagesEntry } from '../../../core/block/pages'
import { blockType, mayContain } from '../../../core/block/registry'
import { ROOT_ID, type BlockNode, type MaskTree } from '../../../core/block/tree'
import { declaredProperty, subtreeIds } from '../../../core/block/treeOps'
import type { ActionChains } from '../../../core/data/steps/steps'
import { droppedKeys, withoutColumnsPointer } from '../columnCleanup'

// The edits of the mask tree as plain functions: each takes the tree and
// gives the next one, or null when the edit does not apply. The store
// records the history and tells its listeners.

export function blockAdded(
  tree: MaskTree,
  type: string,
  parentId: string,
  index: number | undefined,
  rows: number | null,
): { tree: MaskTree; node: BlockNode } | null {
  const parent = tree[parentId]
  if (!parent || !mayContain(parent.type, type)) return null
  const spec = gridMetricsOf(blockType(type))
  const slot = isGridArea(parent)
    ? slotOn(tree, parent.id, spec.startWidth, spec.startHeight, rows)
    : undefined
  if (slot === null) return null
  const { nodes, rootId } = newSubtree(type)
  const node = nodes[rootId]
  node.parentId = parent.id

  if (slot) {
    const w = Math.min(spec.startWidth, columnsOf(tree, parent.id))
    node.values = { ...node.values, gridX: slot.x, gridY: slot.y, gridW: w, gridH: spec.startHeight }
  }
  const childIds = [...parent.childIds]
  const at = index === undefined
    ? childIds.length
    : Math.max(0, Math.min(index, childIds.length))
  childIds.splice(at, 0, node.id)
  return {
    tree: { ...tree, ...nodes, [parent.id]: { ...parent, childIds } },
    node,
  }
}

// The block and everything under it leave the tree.
export function blockRemoved(tree: MaskTree, id: string): { tree: MaskTree; removed: ReadonlySet<string> } | null {
  const node = tree[id]
  if (!node || id === ROOT_ID) return null
  const removed = new Set(subtreeIds(tree, id))
  const next: MaskTree = {}
  for (const [key, value] of Object.entries(tree)) {
    if (!removed.has(key)) next[key] = value
  }
  if (node.parentId && next[node.parentId]) {
    const parent = next[node.parentId]
    next[node.parentId] = { ...parent, childIds: parent.childIds.filter((c) => c !== id) }
  }
  return { tree: next, removed }
}

export function inSubtree(tree: MaskTree, ancestorId: string, id: string): boolean {
  let cur: string | null | undefined = id
  while (cur) {
    if (cur === ancestorId) return true
    cur = tree[cur]?.parentId
  }
  return false
}

export type PropertyOutcome =
  | { kind: 'changed'; tree: MaskTree }
  // The value already stands there.
  | { kind: 'same' }
  // No such property, or a value the declaration does not read.
  | { kind: 'refused' }

// The tree holds only what a declaration reads, so the element, the export
// and the next load all see the same value.
export function propertyUpdated(
  tree: MaskTree,
  pages: readonly PagesEntry[],
  id: string,
  name: string,
  raw: unknown,
): PropertyOutcome {
  const node = tree[id]
  if (!node) return { kind: 'refused' }
  const declared = declaredProperty(node, name)
  if (declared === undefined) return { kind: 'refused' }
  const def = blockType(node.type)

  const read = declared.type.read(writeValue(def, pages, id, name, raw))
  if (!read.ok) return { kind: 'refused' }
  const value = read.value

  if (Object.is(node.values[name], value)) return { kind: 'same' }
  const properties = def?.properties ?? {}
  // What this value presets, like color and size of a text by its role,
  // follows it again. What was picked from a source starts empty with a new
  // one: its fields, their plain names and the entries of its list.
  const dependents = Object.entries(properties).flatMap(([key, other]) => {
    if (other.preset?.by === name) return [[key, other.default]]
    if (other.sourceProp !== name) return []
    const plain = other.plainNameProp
    return plain === undefined || properties[plain] === undefined
      ? [[key, other.default]]
      : [[key, other.default], [plain, properties[plain].default]]
  })
  const list = capability(def, 'list')?.binding
  const entries = list?.sourceProp === name ? node.values[list.prop] : undefined
  if (list && Array.isArray(entries) && entries.length > 0) dependents.push([list.prop, []])
  const next: MaskTree = {
    ...tree,
    [id]: { ...node, values: { ...node.values, ...Object.fromEntries(dependents), [name]: value } },
  }

  const cleaned = withoutColumnsPointer(
    next,
    id,
    droppedKeys(def, name, node.values[name], value),
  )
  return { kind: 'changed', tree: cleaned.tree }
}

// The action chains of a block; an event without steps is not kept.
export function eventsUpdated(tree: MaskTree, id: string, events: ActionChains): MaskTree | null {
  const node = tree[id]
  if (!node || id === ROOT_ID) return null
  const clean: ActionChains = {}
  for (const [key, steps] of Object.entries(events)) {
    if (steps.length > 0) clean[key] = steps
  }
  const next: BlockNode = { ...node }
  if (Object.keys(clean).length > 0) next.chains = clean
  else delete next.chains
  return { ...tree, [id]: next }
}
