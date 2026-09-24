import type { PropertyValue } from '../../core/block/property'
import { ROOT_ID, ROOT_TYPE, type BlockNode, type MaskTree } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { DOCUMENT_FRAME_PROP } from '../../core/block/documentFrame'
import { MASK_NAME_PROP } from '../../core/block/maskName'
import { chainsClean } from '../../core/data/steps/chains'
import { isUnread } from '../../core/unread'
import { treeFromRoot } from './treeFromRoot'
import { valuesClean } from '../../core/block/treeOps'

export function checkTreeState(raw: {
  tree?: unknown
  selectedId?: unknown
}): { tree: MaskTree; selectedId: string | null } | null {
  if (!isUnread<MaskTree>(raw.tree)) return null
  const read: MaskTree = Object.create(null) as MaskTree
  for (const [id, node] of Object.entries(raw.tree)) {
    if (!isUnread<BlockNode>(node) || node.id !== id || typeof node.type !== 'string'
      || !isUnread<BlockNode['values']>(node.values) || !Array.isArray(node.childIds)
      || !node.childIds.every((childId): childId is string => typeof childId === 'string')
      || !(node.parentId === null || typeof node.parentId === 'string')) {
      continue
    }
    const def = blockType(node.type)
    if (id === ROOT_ID ? node.type !== ROOT_TYPE || node.parentId !== null : !def) continue
    const values = id === ROOT_ID
      ? Object.fromEntries(Object.entries(node.values).filter(([key, value]) =>
          [MASK_NAME_PROP, DOCUMENT_FRAME_PROP].includes(key) && typeof value === 'string')) as Record<string, PropertyValue>
      : valuesClean(node.type, node.values)
    const events = chainsClean(node.chains, (capability(def, 'events')?.list ?? []).map((event) => event.key))
    read[id] = { id, type: node.type, parentId: node.parentId, values,
      childIds: [...node.childIds], ...(events ? { chains: events } : {}) }
  }
  if (!read[ROOT_ID]) return null
  const tree = treeFromRoot(read)
  return { tree, selectedId:
    typeof raw.selectedId === 'string' && raw.selectedId !== ROOT_ID && tree[raw.selectedId] ? raw.selectedId : null,
  }
}
