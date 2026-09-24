import type { OrderAdapter } from './orderAdapter'
import { noOrder, type NoOrder } from './none'
import { sefileloop, type SefileloopOrder } from './sefileloop'
import { varOrder, type VarOrder } from './var'
import { erpApiCall, type ErpApiCallOrder } from './erpapicall'
import { dataset, type DatasetOrder } from './dataset'
import { mask, type MaskOrder } from './mask'

export type Order = NoOrder | SefileloopOrder | VarOrder | ErpApiCallOrder | DatasetOrder | MaskOrder

export type OrderKind = Order['kind']

// The order of the entries is the order in which the sheet is filled: the VAR
// entries of header keys stand before those of open records.
export const ORDER_ADAPTERS: { [K in OrderKind]: OrderAdapter<K> } = {
  none: noOrder,
  sefileloop,
  var: varOrder,
  erpapicall: erpApiCall,
  dataset,
  mask,
}

export const ORDER_KINDS: readonly OrderKind[] = Object.values(ORDER_ADAPTERS).map((a) => a.kind)

export function orderAdapter(kind: OrderKind): OrderAdapter<OrderKind> {
  return ORDER_ADAPTERS[kind]
}

export function isOrderKind(kind: string): kind is OrderKind {
  return (ORDER_KINDS as readonly string[]).includes(kind)
}
