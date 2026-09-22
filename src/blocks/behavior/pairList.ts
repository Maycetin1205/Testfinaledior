import { isPropertyEntry } from '../../core/block/property'
import type { KeyPair } from '../../core/data/extraSources'

export interface PairEntry {
  id: string

  partnerId: string

  pairs: KeyPair[]
}

export interface PairListChoice {
  withoutPairsKeep?: boolean
}

export function pairListFromAttribut(
  el: HTMLElement,
  attributName: string,
  idField: string,
  choice: PairListChoice = {},
): PairEntry[] {
  const raw = el.getAttribute(attributName) ?? ''
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
        if (typeof pair.ofField !== 'string' || typeof pair.toField !== 'string') continue
        if (pair.ofField.trim() === '' || pair.toField.trim() === '') continue
        pairs.push({ ofField: pair.ofField, toField: pair.toField })
      }
      if (pairs.length === 0 && choice.withoutPairsKeep !== true) continue
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
