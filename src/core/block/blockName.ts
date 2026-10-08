import { bindingFields } from './binding'
import type { BlockNode } from './tree'
import { defaultsOf, type PropertyValue } from './property'
import { bindingProp } from './capability'
import { blockType } from './registry'
import { bindableSpotsOf } from './treeQuery'
import { ownSourcesOf } from './sourcesInReach'
import { boundField } from '../data/boundField'
import type { DataSource } from '../data/dataSources'

const TEXT_PROPS = ['title', 'text', 'label'] as const

const MAX_LENGTH = 28

function ownText(
  props: Readonly<Record<string, PropertyValue>>,
  defaults?: Readonly<Record<string, PropertyValue>>,

  covered?: ReadonlySet<string>,
): string {
  for (const key of TEXT_PROPS) {
    if (covered?.has(key)) continue
    const value = props[key]
    if (typeof value !== 'string' || value.trim() === '') continue
    if (defaults && value === defaults[key]) continue
    const text = value.trim()
    return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text
  }
  return ''
}

function coveredProps(node: BlockNode): Set<string> {
  const out = new Set<string>()
  for (const spot of bindableSpotsOf(node)) {
    const binding = String(node.values[bindingProp(spot.prop)] ?? '')
    if (binding !== '') out.add(spot.previewProp ?? spot.prop)
  }
  return out
}

function boundAlias(node: BlockNode, library: readonly DataSource[]): string {
  const sources = ownSourcesOf(node, library)
  for (const spot of bindableSpotsOf(node)) {
    const binding = String(node.values[bindingProp(spot.prop)] ?? '')
    for (const field of bindingFields(binding)) {
      const alias = boundField(field, sources)?.name ?? ''
      if (alias !== '') return alias
    }
  }
  return ''
}

export function blockName(node: BlockNode, sources: readonly DataSource[]): string {
  const def = blockType(node.type)
  const text = ownText(node.values, def && defaultsOf(def.properties), coveredProps(node))
  if (text !== '') return text
  const alias = boundAlias(node, sources)
  if (alias !== '') return alias
  return def?.name ?? node.type
}
