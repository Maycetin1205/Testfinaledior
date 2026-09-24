import type { DeliveryAdapter, RuntimeEntry } from './deliveryAdapter'
import { push, type PushDelivery, type RuntimePushDelivery } from './push'
import { message, type MessageDelivery, type RuntimeMessageDelivery } from './message'
import { relationRows, type RelationRowsDelivery, type RuntimeRelationRowsDelivery } from './relationRows'
import { relationValue, type RelationValueDelivery, type RuntimeRelationValueDelivery } from './relationValue'
import type { Unread } from '../../unread'

export type Delivery = PushDelivery | MessageDelivery | RelationRowsDelivery | RelationValueDelivery

export type RuntimeDelivery =
  | RuntimePushDelivery
  | RuntimeMessageDelivery
  | RuntimeRelationRowsDelivery
  | RuntimeRelationValueDelivery

export type DeliveryKind = Delivery['kind']

// Sources that fetch after a delivery ask in this order. The export entry of a
// pushed list has no key of its own, so push reads it back last.
const DELIVERY_ADAPTERS: { [K in DeliveryKind]: DeliveryAdapter<K> } = {
  relationRows,
  relationValue,
  message,
  push,
}

export const DELIVERY_KINDS: readonly DeliveryKind[] = Object.values(DELIVERY_ADAPTERS).map((a) => a.kind)

export function deliveryAdapter(kind: DeliveryKind): DeliveryAdapter<DeliveryKind> {
  return DELIVERY_ADAPTERS[kind]
}

export function isDeliveryKind(kind: string): kind is DeliveryKind {
  return (DELIVERY_KINDS as readonly string[]).includes(kind)
}

export function runtimeDeliveryFrom(entry: Unread<RuntimeEntry>): RuntimeDelivery {
  for (const kind of DELIVERY_KINDS) {
    const delivery = deliveryAdapter(kind).readExported(entry)
    if (delivery) return delivery
  }
  return { kind: 'push', openRecord: false }
}
