import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { mayContain } from '../../core/block/registry'

export function treeFromRoot(tree: MaskTree): MaskTree {
  const out: MaskTree = Object.create(null) as MaskTree
  const take = (id: string): void => {
    const node = tree[id]
    const childIds = [...new Set(node.childIds)].filter((child) => {
      const kid = tree[child]
      return kid !== undefined && kid.parentId === id && mayContain(node.type, kid.type)
    })
    out[id] = { ...node, childIds }
    for (const child of childIds) take(child)
  }
  take(ROOT_ID)
  return out
}
