import type { BlockNode, MaskTree } from '../../core/block/tree'
import { isSelectionGiver, selectionSourceIdOf } from '../../core/block/treeQuery'
import type { DataSource } from '../../core/data/dataSources'
import { deliveryAdapter } from '../../core/data/deliveries/deliveries'
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

// What a block follows once the giver is clicked. Field pairs only where the
// rows are not fetched for the chosen row anyway; the same giver keeps its pairs.
export function followOn(block: BlockNode, giverId: string, library: readonly DataSource[]): SelectionFollow[] {
  const before = followOf(block)
  const own = library.find((s) => s.id === selectionSourceIdOf(block))
  const fetches = own !== undefined && deliveryAdapter(own.delivery.kind).fetchOn === 'selection'
  const pairs = before?.giverId === giverId ? before.pairs : []
  return [{ giverId, pairs: fetches || pairs.length > 0 ? pairs : [{ fromField: '', toField: '' }] }]
}
