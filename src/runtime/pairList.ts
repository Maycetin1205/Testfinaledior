import { isPropertyEntry } from '../core/block/property'
import type { KeyPair } from '../core/data/extraSources'

export interface PairEntry {
  id: string

  partnerId: string

  pairs: KeyPair[]
}

export interface PairListOptions {
  keepWithoutPairs?: boolean
}

export function pairListFromAttribute(
  el: HTMLElement,
  attributeName: string,
  idField: string,
  options: PairListOptions = {},
): PairEntry[] {
  const raw = el.getAttribute(attributeName) ?? ''
  if (raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const acc: PairEntry[] = []
    for (const entry of parsed) {
      if (!isPropertyEntry(entry)) continue
      const id = entry[idField]
      if (typeof id !== 'string' || id === '') continue
      const pairs: KeyPair[] = []
      for (const pair of Array.isArray(entry.pairs) ? entry.pairs : []) {
        if (!isPropertyEntry(pair)) continue
        if (typeof pair.fromField !== 'string' || typeof pair.toField !== 'string') continue
        if (pair.fromField.trim() === '' || pair.toField.trim() === '') continue
        pairs.push({ fromField: pair.fromField, toField: pair.toField })
      }
      if (pairs.length === 0 && options.keepWithoutPairs !== true) continue
      const partnerId = typeof entry.partnerId === 'string' && entry.partnerId !== id
        ? entry.partnerId
        : ''
      acc.push({ id, partnerId, pairs })
    }
    return acc
  } catch {
    return []
  }
}
