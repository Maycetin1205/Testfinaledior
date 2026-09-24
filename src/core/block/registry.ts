import { ROOT_TYPE } from './tree'
import type { BlockDeclaration, BlockType } from './blockType'
import { hasCapability, type ContractKind, type RuntimeContracts } from './capability'

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

function isInstance<T>(el: Element, element: abstract new (...args: never[]) => T): el is Element & T {
  return el instanceof element
}

// The element as the contract of a capability its block declares, nothing when
// the block declares none. Declared but not fulfilled fails loudly.
export function contractOf<A extends ContractKind>(
  el: Element,
  kind: A,
): RuntimeContracts[A] | undefined {
  const def = blockTypeForTag(el.tagName)
  if (!hasCapability(def, kind)) return undefined
  const element = def?.contracts?.[kind]
  if (element !== undefined && isInstance(el, element)) return el
  throw new Error(
    `<${el.tagName.toLowerCase()}> meldet die Faehigkeit „${kind}", nennt aber keine Klasse, die sie erfuellt.`,
  )
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
