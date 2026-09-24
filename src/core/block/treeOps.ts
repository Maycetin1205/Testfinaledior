import {
  ROOT_ID,
  ROOT_TYPE,
  type BlockNode,
  type MaskTree,
} from './tree'
import { blockType } from './registry'
import {
  readValues,
  textProperty,
  type Property,
  type PropertyMap,
  type PropertyValue,
} from './property'
import { DOCUMENT_FRAME_PROP } from './documentFrame'
import { MASK_NAME_PROP } from './maskName'
import type { Unread } from '../unread'

// The root is no block; it keeps the mask's own name and frame number.
const ROOT_PROPERTIES: PropertyMap = {
  [MASK_NAME_PROP]: textProperty({ default: '', label: 'Name der Maske', place: 'none' }),
  [DOCUMENT_FRAME_PROP]: textProperty({ default: '', label: 'Layoutrahmen', place: 'none' }),
}

function createRootNode(): BlockNode {
  return { id: ROOT_ID, type: ROOT_TYPE, values: {}, parentId: null, childIds: [] }
}

export function emptyTree(): MaskTree {
  return { [ROOT_ID]: createRootNode() }
}

export function valuesClean(
  type: string,
  rawProps: Unread<BlockNode['values']>,
): Record<string, PropertyValue> {
  const def = blockType(type)
  if (!def) return {}
  return readValues(def.properties, rawProps)
}

export function declaredProperty(node: BlockNode, name: string): Property<PropertyValue> | undefined {
  const properties = node.id === ROOT_ID ? ROOT_PROPERTIES : blockType(node.type)?.properties
  return properties !== undefined && Object.hasOwn(properties, name) ? properties[name] : undefined
}

export function subtreeIds(tree: MaskTree, id: string): string[] {
  const acc: string[] = []
  const rec = (nid: string): void => {
    const n = tree[nid]
    if (!n) return
    acc.push(nid)
    n.childIds.forEach(rec)
  }
  rec(id)
  return acc
}
