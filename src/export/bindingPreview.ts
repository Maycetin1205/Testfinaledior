import type { BlockNode } from '../core/block/tree'
import { bindingProp, type BindableSpot } from '../core/block/capability'
import { bindableSpotsOf } from '../core/block/treeQuery'
import { ownSourcesOf } from '../core/block/sourcesInReach'
import { boundNames } from '../core/data/boundField'
import type { DataSource } from '../core/data/dataSources'

export function previewSpotsOf(node: BlockNode): Map<string, BindableSpot> {
  return new Map(bindableSpotsOf(node).flatMap((spot) => (spot.previewProp === undefined
    ? []
    : [[spot.previewProp, spot] as const])))
}

export function previewRaw(
  node: BlockNode,
  spot: BindableSpot,
  sources: readonly DataSource[],
  fallback: unknown,
): string {
  const binding = String(node.values[bindingProp(spot.prop)] ?? '')
  if (binding === '') {
    return String(node.values[spot.previewProp ?? spot.prop] ?? fallback ?? '')
  }
  return boundNames(binding, ownSourcesOf(node, sources))
}
