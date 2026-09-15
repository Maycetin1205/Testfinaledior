// Der Text, den eine gebundene Stelle im Editor als Vorschau zeigt.
import type { BlockNode } from '../core/blocks/BlockData'
import { bindingProp, type BindableSpot } from '../core/blocks/faehigkeiten'
import { bindbareStellenVon, QUELLE_PROP } from '../core/blocks/treeQuery'
import { feldKlarname, type DataSource } from '../core/data/dataSources'

export function vorschauStellenVon(node: BlockNode): Map<string, BindableSpot> {
  return new Map(bindbareStellenVon(node).flatMap((spot) => (spot.vorschauProp === undefined
    ? []
    : [[spot.vorschauProp, spot] as const])))
}

export function vorschauRoh(
  node: BlockNode,
  spot: BindableSpot,
  sources: readonly DataSource[],
  standard: unknown,
): string {
  const bindung = String(node.props[bindingProp(spot.prop)] ?? '')
  if (bindung === '') {
    return String(node.props[spot.vorschauProp ?? spot.prop] ?? standard ?? '')
  }
  return feldKlarname(bindung, String(node.props[QUELLE_PROP] ?? ''), sources)
}
