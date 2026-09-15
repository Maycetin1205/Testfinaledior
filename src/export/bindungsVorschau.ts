// Der Text, den eine gebundene Stelle im Editor als Vorschau zeigt.
import type { Baustein } from '../kern/maske/baum'
import { bindungsProp, type BindbareStelle } from '../kern/maske/faehigkeiten'
import { bindbareStellenVon, QUELLE_PROP } from '../kern/maske/baumFragen'
import { feldKlarname, type Datenquelle } from '../kern/daten/datenquellen'

export function vorschauStellenVon(node: Baustein): Map<string, BindbareStelle> {
  return new Map(bindbareStellenVon(node).flatMap((spot) => (spot.vorschauProp === undefined
    ? []
    : [[spot.vorschauProp, spot] as const])))
}

export function vorschauRoh(
  node: Baustein,
  spot: BindbareStelle,
  sources: readonly Datenquelle[],
  standard: unknown,
): string {
  const bindung = String(node.props[bindungsProp(spot.prop)] ?? '')
  if (bindung === '') {
    return String(node.props[spot.vorschauProp ?? spot.prop] ?? standard ?? '')
  }
  return feldKlarname(bindung, String(node.props[QUELLE_PROP] ?? ''), sources)
}
