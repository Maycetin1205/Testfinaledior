import { orderedFields, type DataSource } from '../core/data/dataSources'
import { ORDER_KINDS, orderAdapter } from '../core/data/orders/orders'
import { sheetFrom } from '../core/data/orders/sheet'
import { escapeNonAsciiJs } from './serializer'

export function buildSevariablen(
  used: readonly DataSource[],

  usedFields: ReadonlyMap<string, ReadonlySet<string>>,

  getKey: ReadonlyMap<string, string[]>,
): string {
  const fields = (s: DataSource, wildcard: boolean): string =>
    orderedFields(s, usedFields.get(s.id), getKey.get(s.id) ?? [], wildcard)
  const parts = ORDER_KINDS.map((kind) =>
    orderAdapter(kind).sheet(used.filter((s) => s.order.kind === kind), fields))
  return escapeNonAsciiJs(JSON.stringify(sheetFrom(parts), null, 2)) + '\n'
}
