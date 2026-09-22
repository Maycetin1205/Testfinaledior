import { ROOT_ID, type MaskTree } from './tree'

export const MASK_NAME_PROP = 'maskName'
export const MASK_NAME_STANDARD = 'Maske'

export function maskNameOf(tree: MaskTree): string {
  const raw = tree[ROOT_ID]?.values[MASK_NAME_PROP]
  const name = typeof raw === 'string' ? raw.trim() : ''
  return name === '' ? MASK_NAME_STANDARD : name
}
