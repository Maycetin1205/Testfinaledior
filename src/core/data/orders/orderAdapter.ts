import type { DataSource } from '../dataSources'
import type { Order, OrderKind } from './orders'
import type { SheetPart } from './sheet'
import type { Unread } from '../../unread'

// An intersection instead of Extract keeps an adapter of one kind assignable to
// the adapter of all kinds.
export type OrderOf<K extends OrderKind> = Order & { kind: K }

export type OrderedSource<K extends OrderKind> = DataSource & { order: OrderOf<K> }

// wildcard: SoftEngine may be asked for '*' instead of the used fields.
export type SheetFields = (source: DataSource, wildcard: boolean) => string

// What goes onto the order sheet (SEvariablen) for a source.
export interface OrderAdapter<K extends OrderKind> {
  kind: K
  read(raw: Unread<OrderOf<K>>): OrderOf<K> | null
  // Without its table id the source orders nothing.
  needsTable: boolean
  // SoftEngine sends every field of the table without being given a list.
  allFields(order: OrderOf<K>): boolean
  sheet(sources: readonly OrderedSource<K>[], fields: SheetFields): SheetPart
}
