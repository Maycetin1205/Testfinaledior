import { ROOT_ID, type BlockNode, type MaskTree } from './tree'
import { type ValueSpot, type BindableSpot, capability, applies, hasCapability } from './capability'
import { blockType } from './registry'
import { flagOn, flagFor } from './listBinding'
import { propertyVisible } from './property'
import { SOURCE_PROP } from './sourceProperty'

export { SOURCE_PROP }

export interface ValueSpotsTarget {
  node: BlockNode
  spot: ValueSpot
}

function nodesWhere(tree: MaskTree, fits: (node: BlockNode) => boolean): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (fits(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function valueSpotsInTree(tree: MaskTree): ValueSpotsTarget[] {
  return nodesWhere(tree, () => true).flatMap((node) =>
    (capability(blockType(node.type), 'actionValue')?.spots ?? []).map((spot) => ({ node, spot })))
}

export function sourcesIdsInChainsOf(node: BlockNode): string[] {
  const ids: string[] = []
  for (const event of capability(blockType(node.type), 'events')?.list ?? []) {
    for (const step of node.chains?.[event.key] ?? []) {
      if (step.kind !== 'RELATION') continue
      for (const binding of [...step.parameter, ...step.extraParameter]) {
        if (binding.source !== 'dataField') continue
        const id = binding.sourceId ?? ''
        if (id !== '') ids.push(id)
      }
    }
  }
  return ids
}

export function relationIdsOf(node: BlockNode): string[] {
  const ids: string[] = []
  for (const event of capability(blockType(node.type), 'events')?.list ?? []) {
    for (const step of node.chains?.[event.key] ?? []) {
      if (step.kind === 'RELATION' && step.relationId !== '') ids.push(step.relationId)
    }
  }
  return ids
}

export function carriesOwnSource(node: BlockNode | undefined): boolean {
  if (!node) return false
  return applies(capability(blockType(node.type), 'source'), node.values)
}

export function bindableSpotsOf(node: BlockNode | undefined): readonly BindableSpot[] {
  if (!node) return []
  const spots = capability(blockType(node.type), 'bindable')?.spots ?? []
  return spots.filter((s) => propertyVisible(s.when, node.values))
}

export function selectionSourceIdOf(node: BlockNode | undefined): string {
  if (!node) return ''
  const choice = capability(blockType(node.type), 'recordPick')
  const prop = choice && propertyVisible(choice.when, node.values)
    ? choice.sourceProp ?? SOURCE_PROP
    : SOURCE_PROP
  const value = node.values[prop]
  return typeof value === 'string' ? value : ''
}

export function isSelectionGiver(node: BlockNode | undefined): boolean {
  if (!node) return false
  if (!hasCapability(blockType(node.type), 'recordPick')) return false
  return selectionSourceIdOf(node) !== ''
}

export function maySelectionFollows(node: BlockNode | undefined): boolean {
  if (!node) return false
  if (!hasCapability(blockType(node.type), 'followsSelection')) return false
  return selectionSourceIdOf(node) !== ''
}

export function selectionGiverInTree(tree: MaskTree): BlockNode[] {
  return nodesWhere(tree, isSelectionGiver)
}

export function captureCarrierInTree(tree: MaskTree): BlockNode[] {
  return nodesWhere(tree, (node) => applies(capability(blockType(node.type), 'capture'), node.values))
}

export function deleteCarrierInTree(tree: MaskTree): BlockNode[] {
  return nodesWhere(tree, carriesDeletions)
}

export function carriesDeletions(node: BlockNode): boolean {
  return applies(capability(blockType(node.type), 'delete'), node.values)
}

export function carriesChanges(node: BlockNode): boolean {
  const def = blockType(node.type)
  const key = capability(def, 'change')?.key
  const binding = capability(def, 'list')?.binding
  if (key === undefined || !binding) return false
  const raw = node.values[binding.prop]
  if (!Array.isArray(raw)) return false
  const flag = (binding.entryFlag ?? []).find((s) => s.key === key)
  if (!flag) return false

  return raw.some((x) => {
    if (!x || typeof x !== 'object') return false
    const entry = x as Record<string, unknown>
    return flagFor(binding, entry).includes(flag)
      && flagOn(flag, entry)
      && String(entry[binding.fieldKey] ?? '') !== ''
  })
}

export function changeCarrierInTree(tree: MaskTree): BlockNode[] {
  return nodesWhere(tree, carriesChanges)
}

export function firstDescendantOfType(
  tree: MaskTree,
  rootId: string,
  type: string,
): string | undefined {
  for (const cid of tree[rootId]?.childIds ?? []) {
    const child = tree[cid]
    if (!child) continue
    if (child.type === type) return cid
    const found = firstDescendantOfType(tree, cid, type)
    if (found) return found
  }
  return undefined
}

export function canCompute(node: BlockNode): boolean {
  return hasCapability(blockType(node.type), 'compute')
}
