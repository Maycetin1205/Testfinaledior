import type { BlockNode, MaskTree } from './tree'
import { blockType, declaredValue } from './registry'
import { propertyVisible } from './property'
import { hasCapability } from './capability'
import { splitBinding } from './binding'
import { SOURCE_PROPERTY } from './sourceProperty'
import { sourcesIdsInChainsOf, carriesOwnSource, maySelectionFollows } from './treeQuery'
import { calculationsProperty, fieldBindingsOf } from '../data/calculation'
import type { DataSource } from '../data/dataSources'
import { followsSelectionProperty } from '../data/selectionFollow'
import {
  completePairs,
  extraSourcesProperty,
  sourceUsable,
  type SourceInReach,
} from '../data/extraSources'

export function sourcesCarrier(tree: MaskTree, id: string): BlockNode | undefined {
  let cur: BlockNode | undefined = tree[id]
  while (cur) {
    if (carriesOwnSource(cur)) return cur
    cur = cur.parentId ? tree[cur.parentId] : undefined
  }
  return undefined
}

// The sources a carrier reads: its own first, then each usable helper source
// once, with the pairs that key it and the source it is keyed to.
export function ownSourcesOf(carrier: BlockNode, library: readonly DataSource[]): SourceInReach[] {
  const sourceId = declaredValue(carrier, SOURCE_PROPERTY)
  const first = sourceId === '' ? undefined : library.find((s) => s.id === sourceId)
  if (!first) return []
  const acc: SourceInReach[] = [{ source: first }]
  const seen = new Set<string>([first.id])
  for (const q of declaredValue(carrier, extraSourcesProperty)) {
    if (seen.has(q.sourceId) || !sourceUsable(q)) continue
    const source = library.find((s) => s.id === q.sourceId)
    if (!source) continue
    seen.add(source.id)

    const partnerId = q.partnerId === source.id ? '' : q.partnerId
    acc.push({ source: source, pairs: completePairs(q), partnerId })
  }
  return acc
}

export function sourcesInReach(
  tree: MaskTree,
  id: string,
  library: readonly DataSource[],
): SourceInReach[] {
  const carrier = sourcesCarrier(tree, id)
  return carrier ? ownSourcesOf(carrier, library) : []
}

// The data window lists and the export orders exactly these sources.
export function sourceIdsUsedBy(node: BlockNode): string[] {
  const ids: string[] = []
  const add = (id: unknown): void => {
    if (typeof id === 'string' && id !== '') ids.push(id)
  }
  if (carriesOwnSource(node)) {
    add(declaredValue(node, SOURCE_PROPERTY))
    for (const q of declaredValue(node, extraSourcesProperty)) {
      if (!sourceUsable(q)) continue
      add(q.sourceId)
      for (const pair of q.pairs) if (pair.from === 'document') add(pair.fromSourceId)
    }
  }
  if (maySelectionFollows(node)) {
    for (const follow of declaredValue(node, followsSelectionProperty)) {
      for (const pair of follow.pairs) if (pair.from === 'document') add(pair.fromSourceId)
    }
  }
  const def = blockType(node.type)
  for (const [key, prop] of Object.entries(def?.properties ?? {})) {
    if (prop.type.control === 'source' && propertyVisible(prop.when, node.values)) add(node.values[key])
  }
  if (hasCapability(def, 'compute')) {
    for (const field of fieldBindingsOf(declaredValue(node, calculationsProperty))) add(splitBinding(field).sourceId)
  }
  for (const id of sourcesIdsInChainsOf(node)) add(id)
  return ids
}

export function firstSourceInReach(
  tree: MaskTree,
  id: string,
  library: readonly DataSource[],
): DataSource | undefined {
  const carrier = sourcesCarrier(tree, id)
  if (!carrier) return undefined
  const sourceId = declaredValue(carrier, SOURCE_PROPERTY)
  return library.find((s) => s.id === sourceId)
}
