// Legt einen neuen Baustein samt seinen vorgesehenen Kindern an.
import type { Baustein, Maskenbaum } from './baum'
import type { KindVorgabe } from './bausteinArt'
import { bausteinArt } from './registry'
import { deepClone } from '../deepClone'

function createBlockNode(type: string, id?: string): Baustein {
  const def = bausteinArt(type)
  if (!def) {
    throw new Error(`Unbekannter Block-Typ: "${type}". Vorher mit meldeBausteinArt anmelden.`)
  }
  return {
    id: id ?? crypto.randomUUID(),
    typ: type,
    werte: deepClone(def.vorgaben),
    elternId: null,
    kinderIds: [],
  }
}

export function neuerTeilbaum(type: string): { nodes: Maskenbaum; rootId: string } {
  const nodes: Maskenbaum = {}
  const build = (spec: KindVorgabe, parentId: string | null): string => {
    const node = createBlockNode(spec.typ)
    node.elternId = parentId
    if (spec.werte) node.werte = { ...node.werte, ...deepClone(spec.werte) }
    nodes[node.id] = node
    const children = spec.kinder ?? bausteinArt(spec.typ)?.kinderVorgabe ?? []
    node.kinderIds = children.map((child) => build(child, node.id))
    return node.id
  }
  const rootId = build({ typ: type }, null)
  return { nodes, rootId }
}
