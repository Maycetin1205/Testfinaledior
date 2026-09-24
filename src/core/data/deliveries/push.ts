import type { DeliveryAdapter } from './deliveryAdapter'

const PUSH_PATHS = ['SEFileLoop', 'Var', 'Tabellen', 'Masken', 'ErpApiCall'] as const

// Where in SoftEngine's delivery the rows stand: Daten.<path>.<alias>, the open
// record under Daten.Var.<table id>.
export type PushPath = (typeof PUSH_PATHS)[number]

export interface PushDelivery {
  kind: 'push'
  path: PushPath
}

export interface RuntimePushDelivery {
  kind: 'push'
  openRecord: boolean
}

function isPushPath(value: unknown): value is PushPath {
  return typeof value === 'string' && (PUSH_PATHS as readonly string[]).includes(value)
}

export const push: DeliveryAdapter<'push'> = {
  kind: 'push',
  read: (raw) => (isPushPath(raw.path) ? { kind: 'push', path: raw.path } : null),
  needsTable: false,
  fetchOn: 'never',
  // Only the open record gets its place named; a list the mask finds under its
  // alias wherever SoftEngine put it.
  export: (delivery) => (delivery.path === 'Var' ? { openRecord: true } : {}),
  readExported: (entry) => ({ kind: 'push', openRecord: entry.openRecord === true }),
  relationIds: () => [],
  bindings: () => [],
  giverFields: () => [],
}
