import { ROOT_ID, type BlockNode, type MaskTree } from '../../core/block/tree'
import type { PropertyValue } from '../../core/block/property'
import { type Parameter, type Step, type ActionChains } from '../../core/data/actions'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { deepClone } from '../../core/deepClone'
import { freePagesName, isPagesBlock, pagesOfMask } from '../../core/block/pages'
import { freePositionForCopy } from '../../core/block/gridArea'

export type NewIdFor = (oldId: string) => string | undefined

function writeBlockReferencesTo(node: BlockNode, newIdFor: NewIdFor): BlockNode {
  const follows = rewrittenFollows(node.values[SELECTION_FOLLOW_PROP], newIdFor)
  const events = node.chains === undefined
    ? undefined
    : rewrittenEvents(node.chains, newIdFor)

  const newProps = follows !== node.values[SELECTION_FOLLOW_PROP]
  const newEvents = events !== undefined && events !== node.chains
  if (!newProps && !newEvents) return node
  return {
    ...node,
    ...(newProps
      ? { values: { ...node.values, [SELECTION_FOLLOW_PROP]: follows as PropertyValue } }
      : {}),
    ...(newEvents ? { chains: events } : {}),
  }
}

function replacementId(old: unknown, newIdFor: NewIdFor): string | undefined {
  if (typeof old !== 'string' || old === '') return undefined
  return newIdFor(old)
}

function rewrittenFollows(raw: unknown, newIdFor: NewIdFor): unknown {
  if (!Array.isArray(raw)) return raw
  let changed = false
  const next = raw.map((entry: unknown) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry
    const fields = entry as Record<string, unknown>
    const target = replacementId(fields.giverId, newIdFor)
    if (target === undefined) return entry
    changed = true
    return { ...fields, giverId: target }
  })
  return changed ? next : raw
}

function rewrittenBinding(
  binding: Parameter,
  newIdFor: NewIdFor,
): Parameter {
  const target = replacementId(binding.blockId, newIdFor)
  return target === undefined ? binding : { ...binding, blockId: target }
}

function rewrittenStep(step: Step, newIdFor: NewIdFor): Step {
  if (step.kind === 'POPUP_OPEN' || step.kind === 'POPUP_CLOSE') {
    const target = replacementId(step.popupId, newIdFor)
    return target === undefined ? step : { ...step, popupId: target }
  }
  if (step.kind !== 'RELATION') return step
  const params = step.parameter.map((b) => rewrittenBinding(b, newIdFor))
  const extraParams = step.extraParameter.map((b) => rewrittenBinding(b, newIdFor))
  const changed = params.some((b, i) => b !== step.parameter[i])
    || extraParams.some((b, i) => b !== step.extraParameter[i])
  return changed ? { ...step, parameter: params, extraParameter: extraParams } : step
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
