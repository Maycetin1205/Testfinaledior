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

export function valueSpotsInTree(tree: MaskTree): ValueSpotsTarget[] {
  const result: ValueSpotsTarget[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const spots = capability(blockType(node.type), 'actionValue')?.spots ?? []
    for (const spot of spots) result.push({ node, spot })
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function sourcesIdsInChainsOf(node: BlockNode): string[] {
  const ids: string[] = []
  for (const event of capability(blockType(node.type), 'events')?.list ?? []) {
    for (const step of node.chains?.[event.key] ?? []) {
      if (step.kind !== 'RELATION') continue
      for (const binding of [...step.parameter, ...step.extraParameter]) {
        if (binding.source !== 'data_field') continue
        const id = binding.sourceId ?? ''
        if (id !== '') ids.push(id)
      }
    }
  }
  return ids
}

export function relationIdsOf(node: BlockNode): string[] {
  const def = blockType(node.type)
  const ids: string[] = []
  for (const [key, prop] of Object.entries(def?.properties ?? {})) {
    if (prop.type.control !== 'relation') continue
    const value = node.values[key]
    if (typeof value === 'string' && value !== '') ids.push(value)
  }
  for (const event of capability(def, 'events')?.list ?? []) {
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
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (isSelectionGiver(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function captureCarrierInTree(tree: MaskTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (applies(capability(blockType(node.type), 'capture'), node.values)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function deleteCarrierInTree(tree: MaskTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (carriesDeletions(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
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
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (carriesChanges(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
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
