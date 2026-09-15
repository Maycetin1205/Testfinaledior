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
    cur = cur.elternId ? tree[cur.elternId] : undefined
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
  return quellenAufloesen(traeger.werte.source, traeger.werte[WEITERE_QUELLEN_PROP], bibliothek)
}

export function bausteineMitQuelle(tree: Maskenbaum, quelleId: string): Baustein[] {
  if (quelleId === '') return []
  return Object.values(tree).filter((n) => nutztQuelle(n, quelleId))
}

function nutztQuelle(n: Baustein, quelleId: string): boolean {
  if (traegtEigeneQuelle(n)) {
    if (n.werte.source === quelleId) return true
    if (weitereQuellenAus(n.werte[WEITERE_QUELLEN_PROP]).some((q) => q.quelleId === quelleId)) {
      return true
    }
  }
  const def = bausteinArt(n.typ)

  for (const prop of def?.eigenschaften ?? []) {
    if (prop.art !== 'quelle' || !eigenschaftSichtbar(prop.wenn, n.werte)) continue
    if (n.werte[prop.schluessel] === quelleId) return true
  }

  return quellenIdsInKettenVon(n).includes(quelleId)
}

export function ersteQuelleInReichweite(
  tree: Maskenbaum,
  id: string,
  bibliothek: readonly Datenquelle[],
): Datenquelle | undefined {
  const traeger = quellenTraeger(tree, id)
  if (!traeger || typeof traeger.werte.source !== 'string') return undefined
  return bibliothek.find((s) => s.id === traeger.werte.source)
}
