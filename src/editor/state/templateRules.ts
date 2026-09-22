import type { BlockNode, MaskTree } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { firstDescendantOfType } from '../../core/block/treeQuery'
import { subtreeIds } from '../../core/block/treeOps'

function owningTemplateBoardId(tree: MaskTree, id: string): string | undefined {
  const node = tree[id]
  if (!node) return undefined
  let cur: BlockNode | undefined = node.parentId ? tree[node.parentId] : undefined
  while (cur) {
    const template = blockType(cur.type)?.templateKind
    if (template && template.type === node.type) {
      return firstDescendantOfType(tree, cur.id, template.type) === id ? cur.id : undefined
    }
    cur = cur.parentId ? tree[cur.parentId] : undefined
  }
  return undefined
}

export function templateMarkFor(tree: MaskTree, id: string): string | undefined {
  const boardId = owningTemplateBoardId(tree, id)
  return boardId
    ? blockType(tree[boardId].type)?.templateKind?.name
    : undefined
}

export function isRemoveProtected(tree: MaskTree, id: string): boolean {
  const remove = new Set(subtreeIds(tree, id))
  for (const nid of remove) {
    const boardId = owningTemplateBoardId(tree, nid)
    if (boardId && !remove.has(boardId)) return true
  }
  return false
}
