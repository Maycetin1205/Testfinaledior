// Welche Relations-Vorlagen die Maske braucht.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../kern/maske/baum'
import { relationIdsVon } from '../kern/maske/baumFragen'
import { holWertVon, type Datenquelle } from '../kern/daten/datenquellen'
import type { RelationsVorlage } from '../kern/daten/relationen'

export function collectRelations(
  tree: Maskenbaum,
  relations: readonly RelationsVorlage[],

  // Eine Quelle der Art „Wert per Relation" ruft ihre Relation selbst; fehlt sie
  // in FF_RELATIONS, findet die Laufzeit sie nicht.
  quellen: readonly Datenquelle[] = [],
): RelationsVorlage[] {
  const seen = new Set<string>()
  const acc: RelationsVorlage[] = []
  const add = (id: string): void => {
    const rel = relations.find((r) => r.id === id)
    if (!rel || seen.has(rel.id)) return
    seen.add(rel.id)
    acc.push(rel)
  }
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    for (const id of relationIdsVon(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[WURZEL_ID])
  for (const quelle of quellen) {
    const hol = holWertVon(quelle)
    if (hol) add(hol.relationId)
  }
  return acc
}
