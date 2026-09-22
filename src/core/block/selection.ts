import { ROOT_ID, type MaskTree } from './tree'
import { pageOf } from './pages'

export function selectionOnPage(
  tree: MaskTree,
  id: string | null,
  pagesRoot: string,
): string | null {
  if (id === null || !tree[id]) return null
  return pageOf(tree, id) === pagesRoot ? id : null
}

export function selectionTarget(
  tree: MaskTree,
  hitId: string,
): string | null {
  return tree[hitId] && hitId !== ROOT_ID ? hitId : null
}
