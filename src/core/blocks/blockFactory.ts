// Legt einen neuen Baustein samt seinen vorgesehenen Kindern an.
import type { Baustein, Maskenbaum } from './BlockData'
import type { KindVorgabe } from './BlockDefinition'
import { bausteinArt } from './blockRegistry'
import { deepClone } from '../../lib/deepClone'

function createBlockNode(type: string, id?: string): Baustein {
  const def = bausteinArt(type)
  if (!def) {
    throw new Error(`Unbekannter Block-Typ: "${type}". Vorher mit meldeBausteinArt anmelden.`)
  }
  return {
    id: id ?? crypto.randomUUID(),
    type,
    props: deepClone(def.defaultProps),
    parentId: null,
    childIds: [],
  }
}

export function neuerTeilbaum(type: string): { nodes: Maskenbaum; rootId: string } {
  const nodes: Maskenbaum = {}
  const build = (spec: KindVorgabe, parentId: string | null): string => {
    const node = createBlockNode(spec.type)
    node.parentId = parentId
    if (spec.props) node.props = { ...node.props, ...deepClone(spec.props) }
    nodes[node.id] = node
    const children = spec.children ?? bausteinArt(spec.type)?.defaultChildren ?? []
    node.childIds = children.map((child) => build(child, node.id))
    return node.id
  }
  const rootId = build({ type }, null)
  return { nodes, rootId }
}
