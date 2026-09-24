import { isSeObject } from '../actions'
import type { DeliveryAdapter } from './deliveryAdapter'

// Asked with an ERPAPICALL message once the mask is open.
export interface MessageDelivery {
  kind: 'message'
}

export interface RuntimeQuery {
  id: string
  fields: string
}

export interface RuntimeMessageDelivery {
  kind: 'message'
  query: RuntimeQuery
}

export const message: DeliveryAdapter<'message'> = {
  kind: 'message',
  read: () => ({ kind: 'message' }),
  needsTable: true,
  fetchOn: 'delivery',
  export: (_, source, context) => ({ query: { id: source.tableId, fields: context.fields(source) } }),
  readExported(entry) {
    const query = entry.query
    if (!isSeObject(query) || typeof query.id !== 'string' || query.id === ''
      || typeof query.fields !== 'string') return null
    return { kind: 'message', query: { id: query.id, fields: query.fields } }
  },
  relationIds: () => [],
  bindings: () => [],
  giverFields: () => [],
}
