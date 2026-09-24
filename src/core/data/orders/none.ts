import type { OrderAdapter } from './orderAdapter'

// The source is not on the order sheet: the mask fetches its rows itself.
export interface NoOrder {
  kind: 'none'
}

export const noOrder: OrderAdapter<'none'> = {
  kind: 'none',
  read: () => ({ kind: 'none' }),
  needsTable: false,
  allFields: () => false,
  sheet: () => ({}),
}
