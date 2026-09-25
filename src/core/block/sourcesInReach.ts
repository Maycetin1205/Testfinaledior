import type { BlockNode, MaskTree } from './tree'
import { blockType } from './registry'
import { propertyVisible } from './property'
import { capability } from './capability'
import { splitBinding } from './binding'
import { SOURCE_PROP, sourcesIdsInChainsOf, carriesOwnSource } from './treeQuery'
import { dataFieldsFrom } from '../data/calculation'
import type { DataSource } from '../data/dataSources'
import {
  sourcesResolve,
  sourceUsable,
  extraSourcesFrom,
  EXTRA_SOURCES_PROP,
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

export function sourcesInReach(
  tree: MaskTree,
  id: string,
  library: readonly DataSource[],
): SourceInReach[] {
  const carrier = sourcesCarrier(tree, id)
  if (!carrier) return []
  return sourcesResolve(carrier.values[SOURCE_PROP], carrier.values[EXTRA_SOURCES_PROP], library)
}

// The data center lists and the export orders exactly these sources.
export function sourceIdsUsedBy(node: BlockNode): string[] {
  const ids: string[] = []
  const add = (id: unknown): void => {
    if (typeof id === 'string' && id !== '') ids.push(id)
  }
  if (carriesOwnSource(node)) {
    add(node.values[SOURCE_PROP])
    for (const q of extraSourcesFrom(node.values[EXTRA_SOURCES_PROP])) {
      if (!sourceUsable(q)) continue
      add(q.sourceId)
      for (const pair of q.pairs) if (pair.from === 'document') add(pair.fromSourceId)
    }
  }
  const def = blockType(node.type)
  for (const [key, prop] of Object.entries(def?.properties ?? {})) {
    if (prop.type.control === 'source' && propertyVisible(prop.when, node.values)) add(node.values[key])
  }
  const compute = capability(def, 'compute')
  if (compute) {
    for (const field of dataFieldsFrom(node.values[compute.prop])) add(splitBinding(field).sourceId)
  }
  for (const id of sourcesIdsInChainsOf(node)) add(id)
  return ids
}

export function blocksWithSource(tree: MaskTree, sourceId: string): BlockNode[] {
  if (sourceId === '') return []
  return Object.values(tree).filter((n) => sourceIdsUsedBy(n).includes(sourceId))
}

export function firstSourceInReach(
  tree: MaskTree,
  id: string,
  library: readonly DataSource[],
): DataSource | undefined {
  const carrier = sourcesCarrier(tree, id)
  if (!carrier || typeof carrier.values[SOURCE_PROP] !== 'string') return undefined
  return library.find((s) => s.id === carrier.values[SOURCE_PROP])
}
