import type { DataSource } from './dataSources'
import { structuredProperty, type Property } from '../block/property'

export interface KeyPair {
  fromField: string
  toField: string
}

export const MAX_KEY_PAIRS = 3

export function completePairs(carrier: { pairs: readonly KeyPair[] }): KeyPair[] {
  return carrier.pairs.filter((p) => p.fromField.trim() !== '' && p.toField.trim() !== '')
}

export interface ExtraSource {
  sourceId: string

  partnerId: string

  pairs: KeyPair[]
}

export const EXTRA_SOURCES_PROP = 'extraSources'

// Edited in its own inspector section, exported so the finished mask orders
// those sources too.
export const extraSourcesProperty: Property<ExtraSource[]> = structuredProperty<ExtraSource[]>({
  read: (raw) => (raw === undefined || Array.isArray(raw)
    ? { ok: true, value: extraSourcesFrom(raw) }
    : { ok: false }),
  toAttribute: (value) => JSON.stringify(value),
  fromAttribute: (raw, fallback) => (raw === null ? fallback : extraSourcesFrom(safeParse(raw))),
}, {
  default: [],
  label: 'Weitere Quellen',
  place: 'none',
  attribute: 'extrasources',
})

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function sourceUsable(q: ExtraSource): boolean {
  return q.sourceId !== ''
}

export function extraSourcesFrom(raw: unknown): ExtraSource[] {
  if (!Array.isArray(raw)) return []
  const acc: ExtraSource[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.sourceId !== 'string') continue
    const pairs: KeyPair[] = []
    for (const p of Array.isArray(e.pairs) ? e.pairs : []) {
      if (!p || typeof p !== 'object') continue
      const pp = p as Record<string, unknown>
      if (typeof pp.fromField !== 'string' || typeof pp.toField !== 'string') continue
      pairs.push({ fromField: pp.fromField, toField: pp.toField })
    }
    acc.push({
      sourceId: e.sourceId,

      partnerId: typeof e.partnerId === 'string' ? e.partnerId : '',
      pairs: pairs.slice(0, MAX_KEY_PAIRS),
    })
  }
  return acc
}

export interface SourceInReach {
  source: DataSource

  pairs?: KeyPair[]

  partnerId?: string
}

export function sourcesResolve(
  sourceId: unknown,
  extraRaw: unknown,
  library: readonly DataSource[],
): SourceInReach[] {
  const first = typeof sourceId === 'string' && sourceId !== ''
    ? library.find((s) => s.id === sourceId)
    : undefined
  if (!first) return []
  const acc: SourceInReach[] = [{ source: first }]
  const seen = new Set<string>([first.id])
  for (const q of extraSourcesFrom(extraRaw)) {
    if (seen.has(q.sourceId) || !sourceUsable(q)) continue
    const source = library.find((s) => s.id === q.sourceId)
    if (!source) continue
    seen.add(source.id)

    const partnerId = q.partnerId === source.id ? '' : q.partnerId
    acc.push({ source: source, pairs: completePairs(q), partnerId })
  }
  return acc
}
