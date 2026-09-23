import type { BlockNode } from './tree'
import { type BlockType } from './blockType'
import { bindingProp, capability } from './capability'
import { propertyVisible, type Property, type PropertyPlace } from './property'

export interface DeclaredProperty {
  key: string
  property: Property<unknown>
}

// Which properties the builder edits where. A directly bound spot and the
// plain-name mirror of a field are not edited as properties at all.
export function propertiesFor(
  block: BlockNode,
  def: BlockType,
  place: PropertyPlace,
): DeclaredProperty[] {
  const directBound = new Set<string>(
    (capability(def, 'bindable')?.spots ?? []).map((s) => bindingProp(s.prop)),
  )
  const plainNames = new Set(
    Object.values(def.properties).map((p) => p.plainNameProp).filter((n) => n !== undefined),
  )
  const out: DeclaredProperty[] = []
  for (const [key, property] of Object.entries(def.properties)) {
    if (directBound.has(key) || plainNames.has(key)) continue
    if (!propertyVisible(property.when, block.values)) continue
    if (property.place !== place) continue
    out.push({ key, property })
  }
  return out
}
