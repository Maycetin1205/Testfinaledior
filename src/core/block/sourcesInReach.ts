import type { BlockNode, MaskTree } from './tree'
import { blockType } from './registry'
import { propertyVisible } from './property'
import { SOURCE_PROP, sourcesIdsInChainsOf, carriesOwnSource } from './treeQuery'
import type { DataSource } from '../data/dataSources'
import {
  sourcesResolve,
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

export function blocksWithSource(tree: MaskTree, sourceId: string): BlockNode[] {
  if (sourceId === '') return []
  return Object.values(tree).filter((n) => usesSource(n, sourceId))
}

function usesSource(n: BlockNode, sourceId: string): boolean {
  if (carriesOwnSource(n)) {
    if (n.values[SOURCE_PROP] === sourceId) return true
    if (extraSourcesFrom(n.values[EXTRA_SOURCES_PROP]).some((q) => q.sourceId === sourceId)) {
      return true
    }
  }
  const def = blockType(n.type)

  for (const [key, prop] of Object.entries(def?.properties ?? {})) {
    if (prop.type.control !== 'source' || !propertyVisible(prop.when, n.values)) continue
    if (n.values[key] === sourceId) return true
  }

  return sourcesIdsInChainsOf(n).includes(sourceId)
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
