import type { OrderAdapter } from './orderAdapter'

export interface DatasetOrder {
  kind: 'dataset'
}

export const dataset: OrderAdapter<'dataset'> = {
  kind: 'dataset',
  read: () => ({ kind: 'dataset' }),
  needsTable: true,
  allFields: () => false,
  sheet: (sources, fields) => ({
    DATASET: sources.map((s) => ({ ID: s.tableId, ALIAS: s.name, FELDER: fields(s, false) })),
  }),
}
