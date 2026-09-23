import { structuredProperty, type Property } from '../block/property'
import {
  MAX_KEY_PAIRS,
  completePairs,
  type KeyPair,
} from './extraSources'

export interface SelectionFollow {
  giverId: string

  pairs: KeyPair[]
}

export const SELECTION_FOLLOW_PROP = 'followsSelection'

export const followsSelectionProperty: Property<SelectionFollow[]> = structuredProperty<SelectionFollow[]>({
  read: (raw) => (raw === undefined || Array.isArray(raw)
    ? { ok: true, value: selectionFollowsFrom(raw) }
    : { ok: false }),
  toAttribute: (value) => JSON.stringify(value),
  fromAttribute: (raw, fallback) => (raw === null ? fallback : selectionFollowsFrom(parseOrEmpty(raw))),
}, {
  default: [],
  label: 'Folgt der Auswahl',
  place: 'none',
  attribute: 'followsselection',
})

function parseOrEmpty(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function followUsable(f: SelectionFollow): boolean {
  return f.giverId !== '' && completePairs(f).length > 0
}

export function selectionFollowsFrom(raw: unknown): SelectionFollow[] {
  if (!Array.isArray(raw)) return []
  const acc: SelectionFollow[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.giverId !== 'string') continue
    const pairs: KeyPair[] = []
    for (const p of Array.isArray(e.pairs) ? e.pairs : []) {
      if (!p || typeof p !== 'object') continue
      const pp = p as Record<string, unknown>
      if (typeof pp.ofField !== 'string' || typeof pp.toField !== 'string') continue
      pairs.push({ ofField: pp.ofField, toField: pp.toField })
    }
    acc.push({ giverId: e.giverId, pairs: pairs.slice(0, MAX_KEY_PAIRS) })
  }
  return acc
}
