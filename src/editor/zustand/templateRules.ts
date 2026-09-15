// Welche Bausteine welche Kinder aufnehmen duerfen.
import type { Baustein, Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { ersterNachfahreVomTyp } from '../../kern/maske/baumFragen'
import { teilbaumIds } from '../../kern/maske/baumOps'

function owningTemplateBoardId(tree: Maskenbaum, id: string): string | undefined {
  const node = tree[id]
  if (!node) return undefined
  let cur: Baustein | undefined = node.elternId ? tree[node.elternId] : undefined
  while (cur) {
    const tc = bausteinArt(cur.typ)?.musterKind
    if (tc && tc.type === node.typ) {
      return ersterNachfahreVomTyp(tree, cur.id, tc.type) === id ? cur.id : undefined
    }
    cur = cur.elternId ? tree[cur.elternId] : undefined
  }
  return undefined
}

export function templateMarkFor(tree: Maskenbaum, id: string): string | undefined {
  const boardId = owningTemplateBoardId(tree, id)
  return boardId
    ? bausteinArt(tree[boardId].typ)?.musterKind?.label
    : undefined
}

export function isRemoveProtected(tree: Maskenbaum, id: string): boolean {
  const remove = new Set(teilbaumIds(tree, id))
  for (const nid of remove) {
    const boardId = owningTemplateBoardId(tree, nid)
    if (boardId && !remove.has(boardId)) return true
  }
  return false
}
