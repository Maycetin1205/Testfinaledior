import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import { relationIdsOf } from '../core/block/treeQuery'
import { getValueOf, type DataSource } from '../core/data/dataSources'
import type { RelationTemplate } from '../core/data/relations'

export function collectRelation(
  tree: MaskTree,
  relation: readonly RelationTemplate[],

  sources: readonly DataSource[] = [],
): RelationTemplate[] {
  const seen = new Set<string>()
  const acc: RelationTemplate[] = []
  const add = (id: string): void => {
    const rel = relation.find((r) => r.id === id)
    if (!rel || seen.has(rel.id)) return
    seen.add(rel.id)
    acc.push(rel)
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    for (const id of relationIdsOf(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])
  for (const source of sources) {
    const get = getValueOf(source)
    if (get) add(get.relationId)
  }
  return acc
}
