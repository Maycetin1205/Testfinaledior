import type { BlockNode, MaskTree } from '../../core/block/tree'
import { isSelectionGiver } from '../../core/block/treeQuery'
import {
  SELECTION_FOLLOW_PROP,
  selectionFollowsFrom,
  type SelectionFollow,
} from '../../core/data/selectionFollow'

export function followOf(block: BlockNode): SelectionFollow | undefined {
  return selectionFollowsFrom(block.values[SELECTION_FOLLOW_PROP])[0]
}

export function giversFor(tree: Readonly<MaskTree>, block: BlockNode): BlockNode[] {
  return Object.values(tree).filter((n) => n.id !== block.id && isSelectionGiver(n))
}

// Whether there is anything to follow, or a following to undo.
export function followOffered(tree: Readonly<MaskTree>, block: BlockNode): boolean {
  return followOf(block) !== undefined || giversFor(tree, block).length > 0
}
