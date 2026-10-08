import { hasCapability } from './capability'
import { textProperty, type Property } from './property'
import { blockType } from './registry'
import type { BlockNode, MaskTree } from './tree'

// An area that a click on another block opens: in the mask it stays closed
// until that block is clicked, and what lies below it moves up. The area names
// the block.
export const OPENED_BY_PROP = 'openedBy'

export const openedByProperty: Property<string> = textProperty({
  default: '',
  label: 'Öffnet mit',
  place: 'none',
  attribute: 'openedby',
})

export function opensByClick(node: BlockNode): boolean {
  return Object.hasOwn(blockType(node.type)?.properties ?? {}, OPENED_BY_PROP)
}

export function isOpener(node: BlockNode): boolean {
  return hasCapability(blockType(node.type), 'opener')
}

export function openerOf(node: BlockNode): string {
  const id = node.values[OPENED_BY_PROP]
  return typeof id === 'string' ? id : ''
}

// Whether an area of the mask opens with this block.
export function opensAnArea(tree: Readonly<MaskTree>, id: string): boolean {
  return Object.values(tree).some((n) => openerOf(n) === id)
}
