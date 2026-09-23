import { ROOT_ID, type BlockNode, type MaskTree } from './tree'
import { blockType } from './registry'

export interface PagesEntry {
  id: string
  name: string
  isMainPage: boolean
}

export function isPagesBlock(node: BlockNode): boolean {
  return blockType(node.type)?.page === true
}

export function isWindowPage(entry: PagesEntry): boolean {
  return !entry.isMainPage
}

export function freePagesName(assign: readonly string[], base: string): string {
  const taken = new Set(assign)
  let name = base
  for (let n = 2; taken.has(name); n++) name = `${base} ${n}`
  return name
}

export function activePagesRoot(tree: MaskTree, activePageId: string): string {
  return activePageId === ROOT_ID || (tree[activePageId] && isPagesBlock(tree[activePageId]))
    ? activePageId : ROOT_ID
}

export function pageOf(tree: MaskTree, id: string): string {
  let cur: BlockNode | undefined = tree[id]
  while (cur) {
    if (isPagesBlock(cur)) return cur.id
    cur = cur.parentId ? tree[cur.parentId] : undefined
  }
  return ROOT_ID
}

export function pagesOfMask(tree: MaskTree): PagesEntry[] {
  const pages = (tree[ROOT_ID]?.childIds ?? [])
    .map((id) => tree[id])
    .filter((n): n is BlockNode => Boolean(n) && isPagesBlock(n))
    .map((n) => ({
      id: n.id,
      name: typeof n.values.name === 'string' && n.values.name !== ''
        ? n.values.name
        : blockType(n.type)?.name ?? 'Seite',
      isMainPage: false,
    }))
  return [{ id: ROOT_ID, name: 'Hauptseite', isMainPage: true }, ...pages]
}

function uniquePageName(
  pages: readonly PagesEntry[],
  ownId: string,
  wanted: string,
): string {
  const key = (s: string): string => s.trim().toLocaleLowerCase('de-DE')
  const taken = new Set(
    pages.filter((s) => s.id !== ownId).map((s) => key(s.name)),
  )
  const base = wanted.trim()
  let name = base
  for (let n = 2; taken.has(key(name)); n++) name = `${base} ${n}`
  return name
}

export function writeValue(
  def: { page?: boolean } | undefined,
  pages: readonly PagesEntry[],
  id: string,
  attr: string,
  value: unknown,
): unknown {
  if (attr !== 'name' || def?.page !== true) return value
  const name = uniquePageName(pages, id, typeof value === 'string' ? value : '')
  return name === '' ? null : name
}

export function childrenInFlow(tree: MaskTree, parentId: string): BlockNode[] {
  const parent = tree[parentId]
  if (!parent) return []
  return parent.childIds
    .map((id) => tree[id])
    .filter((n): n is BlockNode => Boolean(n) && !isPagesBlock(n))
}
