import type { Parameter } from '../actions'
import type { DataSource } from '../dataSources'
import type { Delivery, DeliveryKind, RuntimeDelivery } from './deliveries'
import type { RuntimeQuery } from './message'
import type { RuntimeLoadRelation } from './relationRows'
import type { RuntimeGetValue } from './relationValue'

// An intersection instead of Extract keeps an adapter of one kind assignable to
// the adapter of all kinds.
export type DeliveryOf<K extends DeliveryKind> = Delivery & { kind: K }
export type RuntimeDeliveryOf<K extends DeliveryKind> = RuntimeDelivery & { kind: K }

export interface ExportContext {
  // The fields the mask uses of this source.
  used: ReadonlySet<string> | undefined
  // The field list SoftEngine is asked for.
  fields: (source: DataSource) => string
}

// The keys the mask's source list carries for the runtime.
export interface RuntimeEntry {
  openRecord?: true
  loadRelation?: RuntimeLoadRelation
  getValue?: RuntimeGetValue
  query?: RuntimeQuery
}

// How the rows of a source reach the mask.
export interface DeliveryAdapter<K extends DeliveryKind> {
  kind: K
  read(raw: Readonly<Record<string, unknown>>): DeliveryOf<K> | null
  // Without its table id the source receives nothing.
  needsTable: boolean
  // When the mask fetches the rows itself.
  fetchOn: 'never' | 'delivery' | 'selection'
  export(delivery: DeliveryOf<K>, source: DataSource, context: ExportContext): RuntimeEntry
  readExported(entry: Readonly<Record<string, unknown>>): RuntimeDeliveryOf<K> | null
  relationIds(delivery: DeliveryOf<K>): readonly string[]
  bindings(delivery: DeliveryOf<K>): readonly Parameter[]
  // The fields the chosen row of the giver has to bring along.
  giverFields(delivery: DeliveryOf<K>): readonly string[]
}
