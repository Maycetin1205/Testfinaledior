import { ROOT_ID, type MaskTree } from './tree'

// Where the export of the mask goes: the name of a folder picked on one
// machine. A browser never tells the whole path of a folder; the name is the
// key under which that machine keeps the folder itself. Empty: downloaded.
export const EXPORT_TARGET_PROP = 'exportTarget'

export function exportTargetOf(tree: MaskTree): string {
  const raw = tree[ROOT_ID]?.values[EXPORT_TARGET_PROP]
  return typeof raw === 'string' ? raw.trim() : ''
}
