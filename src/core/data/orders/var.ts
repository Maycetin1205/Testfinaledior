import type { OrderAdapter } from './orderAdapter'

// The record that is open in SoftEngine, ordered under its table id.
export interface VarOrder {
  kind: 'var'
}

export const varOrder: OrderAdapter<'var'> = {
  kind: 'var',
  read: () => ({ kind: 'var' }),
  needsTable: true,
  allFields: () => false,
  sheet: (sources, fields) => ({
    VAR: sources.map((s) => ({ ID: s.tableId, FELDER: fields(s, false) })),
  }),
}
