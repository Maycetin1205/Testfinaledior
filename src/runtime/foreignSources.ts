import { EXTRA_SOURCES_PROP, type KeyPair } from '../core/data/extraSources'
import { splitBinding } from '../core/block/blockType'
import { readActionValue } from '../core/block/registry'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import { maskState } from './maskState'
import { pairListFromAttribute } from './pairList'

const EXTRA_SOURCES_ATTR = EXTRA_SOURCES_PROP.toLowerCase()

export type FieldReader = (row: unknown, value: string) => string

interface Lookup {
  toKey: Map<string, unknown>

  partnerId: string

  pairs: KeyPair[]
}

// The value a key takes from outside the row: a field of the open document or
// the value of a form field in the same mask. Undefined for a key the partner
// gives.
export function outsideValue(pair: KeyPair, el: Element): string | undefined {
  const host = maskState.host
  if (pair.from === 'document') {
    const source = host.source(pair.fromSourceId ?? '')
    const record = source ? host.rows(source)[0] : undefined
    return record === undefined ? '' : host.readField(record, pair.fromField)
  }
  if (pair.from === 'formField') {
    const field = Array.from(el.ownerDocument.querySelectorAll(`[${BLOCK_ID_ATTR}]`))
      .find((candidate) => candidate.getAttribute(BLOCK_ID_ATTR) === pair.fromField)
    return field ? readActionValue(field, pair.fromProp ?? 'value').trim() : ''
  }
  return undefined
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
  return pairListFromAttribute(el, EXTRA_SOURCES_ATTR)
    .map((e) => ({ sourceId: e.id, partnerId: e.partnerId, pairs: e.pairs }))
}

// Whether a helper source of the block takes its key from this form field.
export function keyedByFormField(el: HTMLElement, blockId: string): boolean {
  return extraSourcesOf(el).some((q) => q.pairs.some((p) => p.from === 'formField' && p.fromField === blockId))
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
    lookup.set(q.sourceId, { toKey, partnerId: q.partnerId, pairs: q.pairs })
  }

  // A key from the document or a form field needs no partner record.
  const recordOf = (sourceId: string, row: unknown, running: Set<string>): unknown => {
    if (sourceId === '') return row
    const entry = lookup.get(sourceId)
    if (!entry || running.has(sourceId)) return undefined
    const needsPartner = entry.pairs.some((p) => p.from === undefined)
    running.add(sourceId)
    const partner = needsPartner ? recordOf(entry.partnerId, row, running) : undefined
    running.delete(sourceId)
    if (needsPartner && partner === undefined) return undefined
    const key = keyFrom(entry.pairs.map((p) => outsideValue(p, el) ?? host.readField(partner, p.fromField)))
    return key === '' ? undefined : entry.toKey.get(key)
  }

  return (row, value) => {
    const { sourceId, code } = splitBinding(value)
    if (sourceId === '') return host.readField(row, code)
    const record = recordOf(sourceId, row, new Set())
    return record === undefined ? '' : host.readField(record, code)
  }
}
