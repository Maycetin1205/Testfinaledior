import { ROOT_TYPE } from './tree'
import type { BlockDeclaration, BlockType } from './blockType'

const registry = new Map<string, BlockType>()

export function registerBlockType(declared: BlockDeclaration): void {
  if (registry.has(declared.type)) {
    throw new Error(`Bausteintyp "${declared.type}" ist schon angemeldet.`)
  }
  registry.set(declared.type, {
    ...declared,
    properties: declared.properties ?? {},
    capabilities: declared.capabilities ?? [],
    takesChildren: declared.takesChildren ?? false,
    widthEditable: declared.widthEditable ?? true,
    heightEditable: declared.heightEditable ?? false,
  })
}

export function blockType(type: string): BlockType | undefined {
  return registry.get(type)
}

export function allBlockTypes(): BlockType[] {
  return Array.from(registry.values())
}

export function blockTypeForTag(tagName: string): BlockType | undefined {
  const tag = tagName.toLowerCase()
  return Array.from(registry.values()).find((def) => def.tag.toLowerCase() === tag)
}

export function mayContain(parentType: string, childType: string): boolean {
  const child = registry.get(childType)
  if (!child) return false
  if (child?.allowedParent && !child.allowedParent.includes(parentType)) {
    return false
  }
  const def = registry.get(parentType)
  if (!def) return parentType === ROOT_TYPE
  if (!def.takesChildren) return false
  if (!def.allowedChildren) return true
  return def.allowedChildren.includes(childType)
}
