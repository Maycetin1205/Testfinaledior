import type { BlockNode, MaskTree } from './tree'
import { defaultsOf } from './property'
import type { ChildDefault } from './blockType'
import { blockType } from './registry'
import { deepClone } from '../deepClone'

function createBlockNode(type: string, id?: string): BlockNode {
  const def = blockType(type)
  if (!def) {
    throw new Error(`Unbekannter Block-Typ: "${type}". Vorher mit registerBlockType anmelden.`)
  }
  return {
    id: id ?? crypto.randomUUID(),
    type: type,
    values: deepClone(defaultsOf(def.properties)),
    parentId: null,
    childIds: [],
  }
}

export function newSubtree(type: string): { nodes: MaskTree; rootId: string } {
  const nodes: MaskTree = {}
  const build = (spec: ChildDefault, parentId: string | null): string => {
    const node = createBlockNode(spec.type)
    node.parentId = parentId
    if (spec.values) node.values = { ...node.values, ...deepClone(spec.values) }
    nodes[node.id] = node
    const children = spec.children ?? blockType(spec.type)?.childDefaults ?? []
    node.childIds = children.map((child) => build(child, node.id))
    return node.id
  }
  const rootId = build({ type: type }, null)
  return { nodes, rootId }
}
