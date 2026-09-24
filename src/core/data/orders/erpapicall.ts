import type { OrderAdapter } from './orderAdapter'

export interface ErpApiCallOrder {
  kind: 'erpapicall'
}

export const erpApiCall: OrderAdapter<'erpapicall'> = {
  kind: 'erpapicall',
  read: () => ({ kind: 'erpapicall' }),
  needsTable: true,
  allFields: () => false,
  sheet: (sources, fields) => ({
    ERPAPICALL: sources.map((s) => ({ ID: s.tableId, ALIAS: s.name, FELDER: fields(s, false) })),
  }),
}
