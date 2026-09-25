import type { ListGroup } from '@/editor/widgets/List'
import { ORIGIN_KINDS, type ValueOrigin } from '../../core/data/valueOrigin'

export interface OfferEntry {
  value: string
  name: string
  badge?: string
}

export interface OfferSource {
  sourceId: string
  name: string
  fields: readonly OfferEntry[]
}

// What a place can take a value from; a part left out is not offered there.
export interface OriginOffer {
  row?: readonly OfferEntry[]
  helpers?: readonly OfferSource[]
  document?: OfferSource
  formFields?: readonly OfferEntry[]
  fixed?: boolean
}

export const encodeOrigin = (o: ValueOrigin): string => JSON.stringify([o.kind, o.sourceId ?? '', o.value])

export function decodeOrigin(raw: string): ValueOrigin {
  const [kind, sourceId, value] = JSON.parse(raw) as [ValueOrigin['kind'], string, string]
  return sourceId === '' ? { kind, value } : { kind, sourceId, value }
}

const nameIn = (entries: readonly OfferEntry[] | undefined, value: string): string =>
  entries?.find((e) => e.value === value)?.name || value

// The origin in a few words, as the place shows it.
export function originText(origin: ValueOrigin | null, offer: OriginOffer): string {
  if (origin === null) return ''
  switch (origin.kind) {
    case 'row':
      return `Spalte ${nameIn(offer.row, origin.value)}`
    case 'helper': {
      const source = offer.helpers?.find((h) => h.sourceId === (origin.sourceId ?? ''))
      const field = nameIn(source?.fields, origin.value)
      return source ? `${source.name}: ${field}` : field
    }
    case 'document':
      return `Beleg: ${nameIn(offer.document?.fields, origin.value)}`
    case 'formField':
      return `Feld ${nameIn(offer.formFields, origin.value)}`
    case 'fixed':
      return `„${origin.value}“`
  }
}

// The offer as the groups of a list: a group per kind, a group per source.
export function originGroups(offer: OriginOffer): ListGroup[] {
  const entries = (fields: readonly OfferEntry[], origin: (value: string) => ValueOrigin) =>
    fields.map((f) => ({ value: encodeOrigin(origin(f.value)), name: f.name, badge: f.badge }))
  const fieldsOf = (kind: 'helper' | 'document', s: OfferSource): ListGroup => ({
    key: `${kind}:${s.sourceId}`,
    name: ORIGIN_KINDS[kind],
    badge: s.name,
    entries: entries(s.fields, (value) => ({ kind, sourceId: s.sourceId, value })),
  })
  const groups: ListGroup[] = [
    ...(offer.row
      ? [{ key: 'row', name: ORIGIN_KINDS.row, entries: entries(offer.row, (value) => ({ kind: 'row', value })) }]
      : []),
    ...(offer.helpers ?? []).map((s) => fieldsOf('helper', s)),
    ...(offer.document ? [fieldsOf('document', offer.document)] : []),
    ...(offer.formFields
      ? [{ key: 'formField', name: ORIGIN_KINDS.formField, entries: entries(offer.formFields, (value) => ({ kind: 'formField', value })) }]
      : []),
  ]
  return groups.filter((g) => g.entries.length > 0)
}
