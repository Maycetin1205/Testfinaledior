import {
  ROOT_ID,
  ROOT_TYPE,
  type BlockNode,
  type MaskTree,
} from './tree'
import { blockType } from './registry'
import { readValues, type PropertyValue, type ValueProblem } from './property'

function createRootNode(): BlockNode {
  return { id: ROOT_ID, type: ROOT_TYPE, values: {}, parentId: null, childIds: [] }
}

export function emptyTree(): MaskTree {
  return { [ROOT_ID]: createRootNode() }
}

// Reads a stored bag of values against the block's declaration. What does not
// fit falls back to the default and is reported, so nothing fails silently.
export function valuesClean(
  type: string,
  rawProps: Readonly<Record<string, unknown>>,
): { values: Record<string, PropertyValue>; problems: ValueProblem[] } {
  const def = blockType(type)
  if (!def) return { values: {}, problems: [] }
  return readValues(def.properties, rawProps)
}

export function subtreeIds(tree: MaskTree, id: string): string[] {
  const acc: string[] = []
  const rec = (nid: string): void => {
    const n = tree[nid]
    if (!n) return
    acc.push(nid)
    n.childIds.forEach(rec)
  }
  rec(id)
  return acc
}
