import type { BlockNode } from '../../core/block/tree'
import type { Property } from '../../core/block/property'
import type { DataSource } from '../../core/data/dataSources'

// The source whose fields a field property picks from.
export function fieldSourceOf(
  property: Property<unknown>,
  block: BlockNode,
  sourceInReach: DataSource | undefined,
  library: readonly DataSource[],
): DataSource | undefined {
  if (!property.sourceProp) return sourceInReach
  const id = String(block.values[property.sourceProp] ?? '')
  return library.find((s) => s.id === id)
}

// A control that has nothing to offer yet stays away, like a field without a
// source to pick from.
export function controlShown(
  property: Property<unknown>,
  block: BlockNode,
  sourceInReach: DataSource | undefined,
  library: readonly DataSource[],
): boolean {
  if (property.needsSource && !sourceInReach) return false
  if (property.type.control === 'field' && !fieldSourceOf(property, block, sourceInReach, library)) return false
  return property.type.control !== 'structured'
}
