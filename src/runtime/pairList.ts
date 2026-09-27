import { keyPairFrom, type ExtraSource, type KeyPair } from '../core/data/extraSources'
import { isUnread } from '../core/unread'

interface PairEntry {
  id: string

  partnerId: string

  pairs: KeyPair[]
}

export function pairListFromAttribute(
  el: HTMLElement,
  attributeName: string,
): PairEntry[] {
  const raw = el.getAttribute(attributeName) ?? ''
  if (raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const acc: PairEntry[] = []
    for (const entry of parsed) {
      if (!isUnread<ExtraSource>(entry)) continue
      const id = entry.sourceId
      if (typeof id !== 'string' || id === '') continue
      const pairs: KeyPair[] = []
      for (const raw of Array.isArray(entry.pairs) ? entry.pairs : []) {
        const pair = keyPairFrom(raw)
        if (!pair || pair.fromField.trim() === '' || pair.toField.trim() === '') continue
        pairs.push(pair)
      }
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
