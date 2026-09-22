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
    for (const e of parsed) {
      if (!e || typeof e !== 'object') continue
      const ee = e as Record<string, unknown>
      const id = ee[idField]
      if (typeof id !== 'string' || id === '') continue
      const pairs: KeyPair[] = []
      for (const p of Array.isArray(ee.pairs) ? ee.pairs : []) {
        if (!p || typeof p !== 'object') continue
        const pp = p as Record<string, unknown>
        if (typeof pp.ofField !== 'string' || typeof pp.toField !== 'string') continue
        if (pp.ofField.trim() === '' || pp.toField.trim() === '') continue
        pairs.push({ ofField: pp.ofField, toField: pp.toField })
      }
      if (pairs.length === 0 && choice.withoutPairsKeep !== true) continue
      const partnerId = typeof ee.partnerId === 'string' && ee.partnerId !== id ? ee.partnerId : ''
      acc.push({ id, partnerId, pairs })
    }
    return acc
  } catch {
    return []
  }
}
