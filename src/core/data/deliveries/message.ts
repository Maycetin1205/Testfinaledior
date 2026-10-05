import type { Parameter } from '../actions'
import { isUnread } from '../../unread'
import type { DeliveryAdapter } from './deliveryAdapter'

// Asked with an ERPAPICALL message once the mask is open.

// What narrows the query, as SoftEngine's own masks narrow BELEG.GET: one
// kind of document, and the documents of one address, read from a field of
// a source of the mask, like the open document. Empty asks for all.
export interface QueryRestriction {
  documentKind: string
  address: { sourceId: string; code: string } | null
}

export const WITHOUT_RESTRICTION: QueryRestriction = { documentKind: '', address: null }

export interface MessageDelivery {
  kind: 'message'
  restriction?: QueryRestriction
}

export interface RuntimeQuery {
  id: string
  fields: string
  restriction?: QueryRestriction
}

export interface RuntimeMessageDelivery {
  kind: 'message'
  query: RuntimeQuery
}

export function restricts(restriction: QueryRestriction | undefined): restriction is QueryRestriction {
  return restriction !== undefined && (restriction.documentKind !== '' || restriction.address !== null)
}

function restrictionRead(raw: unknown): QueryRestriction | undefined {
  if (!isUnread<QueryRestriction>(raw)) return undefined
  const documentKind = typeof raw.documentKind === 'string' ? raw.documentKind.trim() : ''
  const a = raw.address
  const address = isUnread<{ sourceId: string; code: string }>(a)
    && typeof a.sourceId === 'string' && a.sourceId !== ''
    && typeof a.code === 'string' && a.code !== ''
    ? { sourceId: a.sourceId, code: a.code }
    : null
  const restriction = { documentKind, address }
  return restricts(restriction) ? restriction : undefined
}

const withRestriction = (restriction: QueryRestriction | undefined): { restriction?: QueryRestriction } =>
  (restricts(restriction) ? { restriction } : {})

export const message: DeliveryAdapter<'message'> = {
  kind: 'message',
  read: (raw) => ({ kind: 'message', ...withRestriction(restrictionRead(raw.restriction)) }),
  needsTable: true,
  fetchOn: 'delivery',
  export: (delivery, source, context) => ({
    query: { id: source.tableId, fields: context.orderedFields(source), ...withRestriction(delivery.restriction) },
  }),
  readExported(entry) {
    const query = entry.query
    if (!isUnread<RuntimeQuery>(query) || typeof query.id !== 'string' || query.id === ''
      || typeof query.fields !== 'string') return null
    return {
      kind: 'message',
      query: { id: query.id, fields: query.fields, ...withRestriction(restrictionRead(query.restriction)) },
    }
  },
  relationIds: () => [],
  // The address is read from its source while the rows are fetched.
  bindings: (delivery): Parameter[] => (delivery.restriction?.address
    ? [{ source: 'dataField', value: delivery.restriction.address.code, sourceId: delivery.restriction.address.sourceId }]
    : []),
  giverFields: () => [],
}
