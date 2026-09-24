import { EXTRA_SOURCES_PROP, type KeyPair } from '../core/data/extraSources'
import { splitBinding } from '../core/block/blockType'
import { maskState } from './maskState'
import { pairListFromAttribute } from './pairList'

const EXTRA_SOURCES_ATTR = EXTRA_SOURCES_PROP.toLowerCase()

export type FieldReader = (row: unknown, value: string) => string

interface Lookup {
  toKey: Map<string, unknown>

  partnerId: string

  hereFields: string[]
}

const KEY_DIVIDER = '\x01'

function keyFrom(values: readonly string[]): string {
  if (values.length === 0) return ''
  const parts: string[] = []
  for (const w of values) {
    const t = w.trim()
    if (t === '') return ''
    parts.push(t)
  }
  return parts.join(KEY_DIVIDER)
}

export function extraSourcesOf(
  el: HTMLElement,
): { sourceId: string; partnerId: string; pairs: KeyPair[] }[] {
  return pairListFromAttribute(el, EXTRA_SOURCES_ATTR, 'sourceId', { keepWithoutPairs: true })
    .map((e) => ({ sourceId: e.id, partnerId: e.partnerId, pairs: e.pairs }))
}

export function makeFieldReader(el: HTMLElement): FieldReader {
  const host = maskState.host
  const extra = extraSourcesOf(el)
  if (extra.length === 0) return (row, value) => host.readField(row, splitBinding(value).code)

  const lookup = new Map<string, Lookup>()

  for (const q of extra) {
    if (q.pairs.length === 0) continue
    const source = host.source(q.sourceId)
    if (!source) continue
    const rows = host.rows(source)
    const toKey = new Map<string, unknown>()
    for (const row of rows) {
      const key = keyFrom(q.pairs.map((p) => host.readField(row, p.toField)))
      if (key !== '' && !toKey.has(key)) toKey.set(key, row)
    }
    lookup.set(q.sourceId, {
      toKey,
      partnerId: q.partnerId,
      hereFields: q.pairs.map((p) => p.fromField),
    })
  }

  const recordOf = (sourceId: string, row: unknown, running: Set<string>): unknown => {
    if (sourceId === '') return row
    const entry = lookup.get(sourceId)
    if (!entry || running.has(sourceId)) return undefined
    running.add(sourceId)
    const partner = recordOf(entry.partnerId, row, running)
    running.delete(sourceId)
    if (partner === undefined) return undefined
    const key = keyFrom(entry.hereFields.map((f) => host.readField(partner, f)))
    return key === '' ? undefined : entry.toKey.get(key)
  }

  return (row, value) => {
    const { sourceId, code } = splitBinding(value)
    if (sourceId === '') return host.readField(row, code)
    const record = recordOf(sourceId, row, new Set())
    return record === undefined ? '' : host.readField(record, code)
  }
}
