import type { OrderAdapter, OrderedSource } from './orderAdapter'
import type { VarEntry } from './sheet'

export interface SefileloopOrder {
  kind: 'sefileloop'
  // SoftEngine may be asked for '*' (the IDB tables).
  wildcard: boolean
  // The table hangs under a header record, like positions under their document.
  underHeader: boolean
  headerKey: string
}

const HEADER_KEY = /^([A-Za-z][A-Za-z0-9]*)_(\d+_\d+)$/

function headerKeyOf(source: OrderedSource<'sefileloop'>): string {
  return source.order.underHeader ? source.order.headerKey.trim() : ''
}

// The header key points into VAR; without that entry SoftEngine drops the loop.
function varOfHeaderKey(source: OrderedSource<'sefileloop'>): VarEntry[] {
  const parts = HEADER_KEY.exec(headerKeyOf(source))
  return parts ? [{ ID: parts[1], FELDER: parts[2] }] : []
}

export const sefileloop: OrderAdapter<'sefileloop'> = {
  kind: 'sefileloop',
  read(raw) {
    const underHeader = raw.underHeader === true
    return {
      kind: 'sefileloop',
      wildcard: raw.wildcard === true,
      underHeader,
      headerKey: underHeader && typeof raw.headerKey === 'string' ? raw.headerKey.trim() : '',
    }
  },
  needsTable: true,
  allFields: (order) => order.wildcard,
  sheet(sources, fields) {
    // A loop under a header fails on its own and SoftEngine then drops every
    // loop after it, so those come last.
    const ordered = [
      ...sources.filter((s) => !s.order.underHeader),
      ...sources.filter((s) => s.order.underHeader),
    ]
    return {
      SEFILELOOP: ordered.map((s) => {
        const headerKey = headerKeyOf(s)
        return {
          INDEX_NR: 0,
          ALIAS: s.name,
          ID: s.tableId,
          ...(headerKey !== '' ? { KOPFSATZ_INDEX: headerKey } : {}),
          FELDER: fields(s, s.order.wildcard),
        }
      }),
      VAR: ordered.flatMap(varOfHeaderKey),
    }
  },
}
