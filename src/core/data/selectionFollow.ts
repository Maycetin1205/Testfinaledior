import { listProperty, type Property } from '../block/property'
import type { Unread } from '../unread'
import { completePairs, keyPairsFrom, type KeyPair } from './extraSources'

// What a block follows: the chosen row of another block, the open document or
// a form field. A pair reads the giver's chosen row unless it names the
// document or a form field, like the key of a helper source.
export interface SelectionFollow {
  // Empty when every pair reads the open document or a form field.
  giverId: string

  pairs: KeyPair[]
}

export const SELECTION_FOLLOW_PROP = 'followsSelection'

export const followsSelectionProperty: Property<SelectionFollow[]> = listProperty<SelectionFollow[]>(selectionFollowsFrom, {
  default: [],
  label: 'Folgt der Auswahl',
  place: 'none',
  attribute: 'followsselection',
})

export function followUsable(f: SelectionFollow): boolean {
  const pairs = completePairs(f)
  return pairs.length > 0 && (f.giverId !== '' || pairs.every((p) => p.from !== undefined))
}

function selectionFollowsFrom(raw: unknown): SelectionFollow[] {
  if (!Array.isArray(raw)) return []
  const acc: SelectionFollow[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e: Unread<SelectionFollow> = entry
    if (typeof e.giverId !== 'string') continue
    acc.push({ giverId: e.giverId, pairs: keyPairsFrom(e.pairs) })
  }
  return acc
}
