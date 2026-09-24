import type { RuntimeSource } from '../core/data/dataSources'
import type { DeliveryKind } from '../core/data/deliveries/deliveries'
import type { RuntimeDeliveryOf } from '../core/data/deliveries/deliveryAdapter'
import { fetchQuerySource } from './queryLoader'
import { loadRowsPerRelation } from './relationLoader'
import { fetchValueSource } from './valueLoader'

type SourceWith<K extends DeliveryKind> = RuntimeSource & { delivery: RuntimeDeliveryOf<K> }

interface Fetch<K extends DeliveryKind> {
  run(source: SourceWith<K>, giverRow: unknown): void
}

const FETCHES: { [K in DeliveryKind]: Fetch<K> } = {
  relationRows: { run: (source, giverRow) => { loadRowsPerRelation(source, source.delivery.load, giverRow) } },
  relationValue: { run: (source) => { fetchValueSource(source, source.delivery.get) } },
  message: { run: (source) => { fetchQuerySource(source, source.delivery.query) } },
  push: { run: () => {} },
}

function fetchOf(kind: DeliveryKind): Fetch<DeliveryKind> {
  return FETCHES[kind]
}

export function fetchRows(source: RuntimeSource, giverRow: unknown): void {
  fetchOf(source.delivery.kind).run(source, giverRow)
}
