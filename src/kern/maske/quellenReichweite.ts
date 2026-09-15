// Eine Datenquelle an einem Baustein setzen und die Folgen im Baum.
import type { Baustein, Maskenbaum } from './baum'
import { bausteinArt } from './registry'
import { eigenschaftSichtbar } from './eigenschaft'
import { quellenIdsInKettenVon, traegtEigeneQuelle } from './baumFragen'
import type { Datenquelle } from '../daten/datenquellen'
import {
  quellenAufloesen,
  weitereQuellenAus,
  WEITERE_QUELLEN_PROP,
  type QuelleInReichweite,
} from '../daten/weitereQuellen'

export function quellenTraeger(tree: Maskenbaum, id: string): Baustein | undefined {
  let cur: Baustein | undefined = tree[id]
  while (cur) {
    if (traegtEigeneQuelle(cur)) return cur
    cur = cur.parentId ? tree[cur.parentId] : undefined
  }
  return undefined
}

export function quellenInReichweite(
  tree: Maskenbaum,
  id: string,
  bibliothek: readonly Datenquelle[],
): QuelleInReichweite[] {
  const traeger = quellenTraeger(tree, id)
  if (!traeger) return []
  return quellenAufloesen(traeger.props.source, traeger.props[WEITERE_QUELLEN_PROP], bibliothek)
}

export function bausteineMitQuelle(tree: Maskenbaum, quelleId: string): Baustein[] {
  if (quelleId === '') return []
  return Object.values(tree).filter((n) => nutztQuelle(n, quelleId))
}

function nutztQuelle(n: Baustein, quelleId: string): boolean {
  if (traegtEigeneQuelle(n)) {
    if (n.props.source === quelleId) return true
    if (weitereQuellenAus(n.props[WEITERE_QUELLEN_PROP]).some((q) => q.quelleId === quelleId)) {
      return true
    }
  }
  const def = bausteinArt(n.type)

  for (const prop of def?.customProperties ?? []) {
    if (prop.kind !== 'quelle' || !eigenschaftSichtbar(prop.visibleWhen, n.props)) continue
    if (n.props[prop.attributeName] === quelleId) return true
  }

  return quellenIdsInKettenVon(n).includes(quelleId)
}

export function ersteQuelleInReichweite(
  tree: Maskenbaum,
  id: string,
  bibliothek: readonly Datenquelle[],
): Datenquelle | undefined {
  const traeger = quellenTraeger(tree, id)
  if (!traeger || typeof traeger.props.source !== 'string') return undefined
  return bibliothek.find((s) => s.id === traeger.props.source)
}
