// Die kleinen Griffe am Baum: Knoten holen, setzen, Kinder ordnen.
import {
  WURZEL_ID,
  WURZEL_TYP,
  type Baustein,
  type Maskenbaum,
} from './baum'
import { bausteinArt } from './registry'
import { deepClone } from '../deepClone'

function createRootNode(): Baustein {
  return { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: [] }
}

export function leererBaum(): Maskenbaum {
  return { [WURZEL_ID]: createRootNode() }
}

export function werteBereinigen(type: string, rawProps: Record<string, unknown>): Record<string, unknown> {
  const def = bausteinArt(type)
  if (!def) return {}
  const next = deepClone(def.vorgaben)

  for (const key of Object.keys(next)) {
    if (Object.prototype.hasOwnProperty.call(rawProps, key)) {
      next[key] = rawProps[key]
    }
  }
  return next
}

export function teilbaumIds(tree: Maskenbaum, id: string): string[] {
  const acc: string[] = []
  const rec = (nid: string): void => {
    const n = tree[nid]
    if (!n) return
    acc.push(nid)
    n.kinderIds.forEach(rec)
  }
  rec(id)
  return acc
}
