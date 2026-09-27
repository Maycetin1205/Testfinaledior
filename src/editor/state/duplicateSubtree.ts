import { ROOT_ID, type BlockNode, type MaskTree } from '../../core/block/tree'
import type { PropertyValue } from '../../core/block/property'
import { stepAdapter, type Step, type ActionChains } from '../../core/data/steps/steps'
import {
  SELECTION_FOLLOW_PROP,
  selectionFollowsFrom,
  type SelectionFollow,
} from '../../core/data/selectionFollow'
import { deepClone } from '../../core/deepClone'
import { freePagesName, isPagesBlock, pagesOfMask } from '../../core/block/pages'
import { freePositionForCopy } from '../../core/block/gridArea'

type NewIdFor = (oldId: string) => string | undefined

function writeBlockReferencesTo(node: BlockNode, newIdFor: NewIdFor): BlockNode {
  const follows = rewrittenFollows(node.values[SELECTION_FOLLOW_PROP], newIdFor)
  const events = node.chains === undefined
    ? undefined
    : rewrittenEvents(node.chains, newIdFor)

  const newEvents = events !== undefined && events !== node.chains
  if (follows === null && !newEvents) return node
  return {
    ...node,
    ...(follows !== null
      ? { values: { ...node.values, [SELECTION_FOLLOW_PROP]: follows } }
      : {}),
    ...(newEvents ? { chains: events } : {}),
  }
}

function replacementId(old: string, newIdFor: NewIdFor): string | undefined {
  if (old === '') return undefined
  return newIdFor(old)
}

// null when no follow points into the copied part: neither its giver nor a
// form field one of its pairs reads.
function rewrittenFollows(raw: PropertyValue | undefined, newIdFor: NewIdFor): SelectionFollow[] | null {
  let changed = false
  const next = selectionFollowsFrom(raw).map((follow) => {
    const giver = replacementId(follow.giverId, newIdFor)
    const pairs = follow.pairs.map((pair) => {
      const field = pair.from === 'formField' ? replacementId(pair.fromField, newIdFor) : undefined
      return field === undefined ? pair : { ...pair, fromField: field }
    })
    const pairsMoved = pairs.some((p, i) => p !== follow.pairs[i])
    if (giver === undefined && !pairsMoved) return follow
    changed = true
    return { giverId: giver ?? follow.giverId, pairs }
  })
  return changed ? next : null
}

function rewrittenStep(step: Step, newIdFor: NewIdFor): Step {
  return stepAdapter(step.kind).withBlockIds(step, newIdFor)
}

function rewrittenEvents(
  events: ActionChains,
  newIdFor: NewIdFor,
): ActionChains {
  let changed = false
  const next: ActionChains = {}
  for (const [key, chain] of Object.entries(events)) {
    const newChain = chain.map((s) => rewrittenStep(s, newIdFor))
    if (newChain.some((s, i) => s !== chain[i])) changed = true
    next[key] = newChain
  }
  return changed ? next : events
}

function cloneSubtree(
  tree: MaskTree,
  id: string,
): { nodes: MaskTree; copyId: string } {
  const nodes: MaskTree = {}
  const newIds = new Map<string, string>()
  const copy = (sourceId: string, parentId: string | null): string => {
    const source = tree[sourceId]
    const newId = crypto.randomUUID()
    newIds.set(sourceId, newId)
    const childIds = source.childIds.map((c) => copy(c, newId))
    nodes[newId] = {
      id: newId,
      type: source.type,
      values: deepClone(source.values),

      ...(source.chains ? { chains: deepClone(source.chains) } : {}),
      parentId: parentId,
      childIds: childIds,
    }
    return newId
  }
  const copyId = copy(id, tree[id].parentId)
  for (const newId of newIds.values()) {
    nodes[newId] = writeBlockReferencesTo(nodes[newId], (old) => newIds.get(old))
  }
  return { nodes, copyId }
}

function withFreePagesNames(tree: MaskTree, id: string, copy: BlockNode): BlockNode {
  const pages = pagesOfMask(tree)
  const base = pages.find((s) => s.id === id)?.name
  if (base === undefined) return copy
  const name = freePagesName(pages.map((s) => s.name), base)
  return { ...copy, values: { ...copy.values, name } }
}

export function duplicateSubtree(
  tree: MaskTree,
  id: string,
  rows: number | null = null,
): { tree: MaskTree; copyId: string } | null {
  const original = tree[id]
  if (!original || id === ROOT_ID || original.parentId === null) return null
  const parent = tree[original.parentId]
  if (!parent) return null
  const { nodes, copyId } = cloneSubtree(tree, id)
  const copy = isPagesBlock(original)
    ? withFreePagesNames(tree, id, nodes[copyId])
    : freePositionForCopy(tree, parent.id, nodes[copyId], rows)
  if (!copy) return null
  nodes[copyId] = copy
  const childIds = [...parent.childIds]
  childIds.splice(parent.childIds.indexOf(id) + 1, 0, copyId)
  return {
    tree: { ...tree, ...nodes, [parent.id]: { ...parent, childIds: childIds } },
    copyId,
  }
}
